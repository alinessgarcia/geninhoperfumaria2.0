"use client";

import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

import type { Product, Customer, Sale, NewsArticle, Tab, CustomerStatus, PaymentMethod } from "../components/types";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, toDate } from "../components/helpers";

import { TabDashboard } from "../components/TabDashboard";
import { TabEstoque } from "../components/TabEstoque";
import { TabClientes } from "../components/TabClientes";
import { TabVendas } from "../components/TabVendas";
import { TabFinanceiro } from "../components/TabFinanceiro";
import { TabNoticias } from "../components/TabNoticias";

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function Page() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // ─── LOAD DATA ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      if (!hasSupabaseConfig) { 
        setLoadError("Supabase não configurado."); 
        setLoading(false); 
        return; 
      }

      const [pRes, cRes, sRes, nRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("sales").select("*").order("sold_at", { ascending: false }),
        supabase.from("news_articles").select("*").order("published_at", { ascending: false }).limit(30),
      ]);
      if (pRes.error || cRes.error || sRes.error) {
        setLoadError(pRes.error?.message ?? cRes.error?.message ?? sRes.error?.message ?? "Erro ao carregar.");
        setLoading(false); return;
      }
      setProducts((pRes.data ?? []).map(r => ({
        id: r.id, name: r.name, brand: r.brand ?? "", category: r.category ?? "",
        ml: Number(r.ml ?? 0), stock: Number(r.stock ?? 0), stockMin: Number(r.stock_min ?? 5),
        costPrice: Number(r.cost_price ?? 0), sellPrice: Number(r.sell_price ?? 0),
      })));
      setCustomers((cRes.data ?? []).map(r => ({
        id: r.id, name: r.name, status: (r.status ?? "ativo") as CustomerStatus,
        risk: (r.risk ?? "nunca_deu_problema") as Customer["risk"],
        origin: (r.origin ?? "direto") as Customer["origin"],
        referredBy: r.referred_by ?? "", contact: r.contact ?? "",
        address: r.address ?? "", city: r.city ?? "",
        neighborhood: r.neighborhood ?? "", notes: r.notes ?? "",
      })));
      setSales((sRes.data ?? []).map(r => ({
        id: r.id, productId: r.product_id, customerId: r.customer_id,
        quantity: Number(r.quantity ?? 1), paymentMethod: r.payment_method as PaymentMethod,
        installments: Number(r.installments ?? 1), deposit: Number(r.deposit ?? 0),
        discount: Number(r.discount ?? 0), unitSalePrice: Number(r.unit_sale_price ?? 0),
        unitCostPrice: Number(r.unit_cost_price ?? 0), soldAt: r.sold_at ?? "",
        notes: r.notes ?? "", dueDates: r.due_dates ?? "",
      })));
      setNews((nRes.data ?? []).map(r => ({
        id: r.id, title: r.title, url: r.url, source: r.source,
        imageUrl: r.image_url ?? null, publishedAt: r.published_at ?? null,
      })));
      setLoading(false);
    };
    load();
  }, []);

  // ─── DERIVED ────────────────────────────────────────────────────────────────

  const productById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const customerById = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c])), [customers]);

  const lowStockProducts = useMemo(() => products.filter(p => p.stock <= p.stockMin), [products]);
  const inadimplentes = useMemo(() => customers.filter(c => c.status === "inadimplente"), [customers]);

  const now = new Date();
  const periodStart = { week: startOfWeek(now), month: startOfMonth(now), quarter: startOfQuarter(now), year: startOfYear(now) };

  const summaryWeek = useMemo(() => {
    let revenue = 0, profit = 0, count = 0;
    for (const s of sales) {
      const d = toDate(s.soldAt);
      if (d < periodStart.week) continue;
      const r = (s.unitSalePrice - s.discount / s.quantity) * s.quantity;
       revenue += r;
      profit += r - s.unitCostPrice * s.quantity;
      count++;
    }
    return { revenue, profit, count };
  }, [sales, periodStart.week]);

  const summaryMonth = useMemo(() => {
    let revenue = 0, profit = 0, count = 0;
    for (const s of sales) {
      const d = toDate(s.soldAt);
      if (d < periodStart.month) continue;
      const r = (s.unitSalePrice - s.discount / s.quantity) * s.quantity;
      revenue += r;
      profit += r - s.unitCostPrice * s.quantity;
      count++;
    }
    return { revenue, profit, count };
  }, [sales, periodStart.month]);

  const summaryQuarter = useMemo(() => {
    let revenue = 0, profit = 0, count = 0;
    for (const s of sales) {
      const d = toDate(s.soldAt);
      if (d < periodStart.quarter) continue;
      const r = (s.unitSalePrice - s.discount / s.quantity) * s.quantity;
      revenue += r;
      profit += r - s.unitCostPrice * s.quantity;
      count++;
    }
    return { revenue, profit, count };
  }, [sales, periodStart.quarter]);

  const summaryYear = useMemo(() => {
    let revenue = 0, profit = 0, count = 0;
    for (const s of sales) {
      const d = toDate(s.soldAt);
      if (d < periodStart.year) continue;
      const r = (s.unitSalePrice - s.discount / s.quantity) * s.quantity;
      revenue += r;
      profit += r - s.unitCostPrice * s.quantity;
      count++;
    }
    return { revenue, profit, count };
  }, [sales, periodStart.year]);

  const totalStockUnits = useMemo(() => products.reduce((a, p) => a + p.stock, 0), [products]);
  const totalInventoryCost = useMemo(() => products.reduce((a, p) => a + p.stock * p.costPrice, 0), [products]);

  // ─── NAV ────────────────────────────────────────────────────────────────────

  const NAV = [
    { id: "dashboard" as Tab, icon: "◈", label: "Dashboard" },
    { id: "estoque" as Tab, icon: "◫", label: "Estoque", badge: lowStockProducts.length || undefined },
    { id: "clientes" as Tab, icon: "◎", label: "Clientes", badge: inadimplentes.length || undefined },
    { id: "vendas" as Tab, icon: "◈", label: "Vendas" },
    { id: "financeiro" as Tab, icon: "◇", label: "Financeiro" },
    { id: "noticias" as Tab, icon: "📰", label: "Notícias" },
  ];

  if (loading) return (
    <div className="app-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="header-logo" style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>✦</div>
        <p style={{ color: "var(--muted)", fontStyle: "italic" }}>Carregando Geninho Perfumaria…</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="app-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div className="card" style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--danger)" }}>⚠</div>
        <h2 className="card-title">Erro de Conexão</h2>
        <p style={{ color: "var(--muted)" }}>{loadError}</p>
        <button className="primary" style={{ marginTop: "1.5rem" }} onClick={() => window.location.reload()}>Recarregar Sistema</button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="app-header">
        <div className="header-brand">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
          <div className="header-logo">✦</div>
          <h1>Geninho <span>Perfumaria</span></h1>
        </div>
        <div className="header-alerts">
          {lowStockProducts.length > 0 && (
            <button className="alert-pill warn" onClick={() => setTab("estoque")}>
              ⚠ {lowStockProducts.length} produto{lowStockProducts.length > 1 ? "s" : ""} em baixo estoque
            </button>
          )}
          {inadimplentes.length > 0 && (
            <button className="alert-pill danger" onClick={() => setTab("clientes")}>
              ✕ {inadimplentes.length} inadimplente{inadimplentes.length > 1 ? "s" : ""}
            </button>
          )}
          {lowStockProducts.length === 0 && inadimplentes.length === 0 && (
            <span className="alert-pill ok">✓ Tudo em ordem</span>
          )}
        </div>
        <div className="header-user">
          {user && (
            <>
              <span className="header-user-email">{user.email}</span>
              <button className="header-logout-btn" onClick={handleLogout} title="Sair">
                ↪ Sair
              </button>
            </>
          )}
        </div>
      </header>

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
        <span className="sidebar-section-label">Menu</span>
        {NAV.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => { setTab(n.id); setIsMobileMenuOpen(false); }}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
            {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
          </button>
        ))}
      </aside>

      {/* CONTENT */}
      <main className="main-content">
        {tab === "dashboard" && <TabDashboard products={products} customers={customers} sales={sales} news={news} summaryWeek={summaryWeek} summaryMonth={summaryMonth} summaryYear={summaryYear} lowStock={lowStockProducts} inadimplentes={inadimplentes} totalStockUnits={totalStockUnits} totalInventoryCost={totalInventoryCost} setTab={setTab} productById={productById} customerById={customerById} />}
        {tab === "estoque" && <TabEstoque products={products} setProducts={setProducts} setSales={setSales} lowStock={lowStockProducts} />}
        {tab === "clientes" && <TabClientes customers={customers} setCustomers={setCustomers} sales={sales} productById={productById} />}
        {tab === "vendas" && <TabVendas sales={sales} setSales={setSales} products={products} setProducts={setProducts} customers={customers} productById={productById} customerById={customerById} />}
        {tab === "financeiro" && <TabFinanceiro sales={sales} products={products} customers={customers} productById={productById} customerById={customerById} summaryWeek={summaryWeek} summaryMonth={summaryMonth} summaryQuarter={summaryQuarter} summaryYear={summaryYear} />}
        {tab === "noticias" && <TabNoticias news={news} />}
      </main>
    </div>
  );
}
