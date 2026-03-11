"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabaseClient";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Product = {
  id: string; name: string; brand: string; category: string;
  ml: number; stock: number; stockMin: number;
  costPrice: number; sellPrice: number;
};

type CustomerStatus = "ativo" | "inadimplente" | "fiel" | "vip";

type Customer = {
  id: string; name: string;
  status: CustomerStatus;
  risk: "nunca_deu_problema" | "ja_deu_problema";
  origin: "direto" | "indicado";
  referredBy: string;
  contact: string; address: string; city: string; neighborhood: string; notes: string;
};

type PaymentMethod = "dinheiro" | "pix" | "cartao_avista" | "cartao_parcelado";

type Sale = {
  id: string; productId: string; customerId: string;
  quantity: number; paymentMethod: PaymentMethod;
  installments: number; deposit: number; discount: number;
  unitSalePrice: number; unitCostPrice: number;
  soldAt: string; notes: string;
};

type NewsArticle = {
  id: string; title: string; url: string; source: string;
  imageUrl: string | null; publishedAt: string | null;
};

type Tab = "dashboard" | "estoque" | "clientes" | "vendas" | "financeiro" | "investimentos";
type Feedback = { kind: "ok" | "error"; text: string } | null;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);
const parseNum = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const toDate = (s: string) => new Date(s + "T00:00:00");
const startOfWeek = (d: Date) => { const s = new Date(d); const day = s.getDay(); s.setDate(s.getDate() - (day === 0 ? 6 : day - 1)); s.setHours(0,0,0,0); return s; };
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfQuarter = (d: Date) => { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); };
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const fmtDate = (s: string | null) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); };

const STATUS_LABELS: Record<CustomerStatus, string> = {
  ativo: "Ativo", inadimplente: "Inadimplente", fiel: "Fiel", vip: "VIP"
};
const STATUS_BADGE: Record<CustomerStatus, string> = {
  ativo: "badge-ok", inadimplente: "badge-danger", fiel: "badge-gold", vip: "badge-navy"
};
const STATUS_ICON: Record<CustomerStatus, string> = {
  ativo: "✓", inadimplente: "⚠", fiel: "★", vip: "♦"
};
const PAY_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro", pix: "Pix", cartao_avista: "Cartão à vista", cartao_parcelado: "Cartão parcelado"
};

const GOLD_PALETTE = ["#b8943f", "#d4a853", "#e8c470", "#f0deb0", "#3b6a8c", "#1e3a4f"];

// ─── FEEDBACK COMPONENT ────────────────────────────────────────────────────────

function FeedbackMsg({ fb }: { fb: Feedback }) {
  if (!fb) return null;
  return <div className={`feedback ${fb.kind}`}>{fb.kind === "ok" ? "✓" : "✕"} {fb.text}</div>;
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function Page() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── LOAD DATA ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasSupabaseConfig) { setLoadError("Supabase não configurado."); setLoading(false); return; }
    const load = async () => {
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
        notes: r.notes ?? "",
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

  const calcSummary = (from: Date) => {
    let revenue = 0, profit = 0, count = 0;
    for (const s of sales) {
      const d = toDate(s.soldAt);
      if (d < from) continue;
      const r = (s.unitSalePrice - s.discount / s.quantity) * s.quantity;
      revenue += r;
      profit += r - s.unitCostPrice * s.quantity;
      count++;
    }
    return { revenue, profit, count };
  };

  const summaryWeek = useMemo(() => calcSummary(periodStart.week), [sales]);
  const summaryMonth = useMemo(() => calcSummary(periodStart.month), [sales]);
  const summaryQuarter = useMemo(() => calcSummary(periodStart.quarter), [sales]);
  const summaryYear = useMemo(() => calcSummary(periodStart.year), [sales]);

  const totalStockUnits = useMemo(() => products.reduce((a, p) => a + p.stock, 0), [products]);
  const totalInventoryCost = useMemo(() => products.reduce((a, p) => a + p.stock * p.costPrice, 0), [products]);

  // ─── TABS ────────────────────────────────────────────────────────────────────

  const NAV = [
    { id: "dashboard" as Tab, icon: "◈", label: "Dashboard" },
    { id: "estoque" as Tab, icon: "◫", label: "Estoque", badge: lowStockProducts.length || undefined },
    { id: "clientes" as Tab, icon: "◎", label: "Clientes", badge: inadimplentes.length || undefined },
    { id: "vendas" as Tab, icon: "◈", label: "Vendas" },
    { id: "financeiro" as Tab, icon: "◇", label: "Financeiro" },
    { id: "investimentos" as Tab, icon: "◆", label: "Investimentos" },
  ];

  if (loading) return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontFamily: "DM Sans, sans-serif", color: "#7a7060" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
        <p>Carregando Geninho Perfumaria…</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ textAlign: "center", color: "#c44040", padding: "2rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠</div>
        <p><strong>Erro de conexão</strong></p>
        <p style={{ color: "#7a7060", marginTop: "0.5rem" }}>{loadError}</p>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="app-header">
        <div className="header-brand">
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
      </header>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <span className="sidebar-section-label">Menu</span>
        {NAV.map(n => (
          <button key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
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
        {tab === "investimentos" && <TabInvestimentos news={news} />}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function TabDashboard({ products, customers, sales, news, summaryWeek, summaryMonth, summaryYear, lowStock, inadimplentes, totalStockUnits, totalInventoryCost, setTab, productById, customerById }: any) {
  const newsScrollRef = useRef<HTMLDivElement>(null);
  const [newsPaused, setNewsPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const newsList = useMemo(() => news.slice(0, 12), [news]);

  useEffect(() => {
    const container = newsScrollRef.current;
    if (!container || newsPaused || newsList.length === 0) return;
    const tick = (ts: number) => {
      if (!newsScrollRef.current) return;
      const last = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const step = (20 * (ts - last)) / 1000;
      newsScrollRef.current.scrollLeft += step;
      if (newsScrollRef.current.scrollLeft >= newsScrollRef.current.scrollWidth - newsScrollRef.current.clientWidth) {
        newsScrollRef.current.scrollLeft = 0;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTsRef.current = null; };
  }, [newsPaused, newsList.length]);

  // Chart: last 7 days revenue
  const last7 = useMemo(() => {
    const days: { date: string; faturamento: number; lucro: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { weekday: "short" });
      const daySales = sales.filter((s: Sale) => s.soldAt === key);
      const faturamento = daySales.reduce((a: number, s: Sale) => a + s.unitSalePrice * s.quantity, 0);
      const lucro = daySales.reduce((a: number, s: Sale) => a + (s.unitSalePrice - s.unitCostPrice) * s.quantity, 0);
      days.push({ date: label, faturamento, lucro });
    }
    return days;
  }, [sales]);

  const recentSales = useMemo(() => sales.slice(0, 5), [sales]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Visão geral do seu negócio hoje</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">💰</div>
          <div className="kpi-label">Faturamento Semanal</div>
          <div className="kpi-value gold">{fmt(summaryWeek.revenue)}</div>
          <div className="kpi-sub">{summaryWeek.count} venda{summaryWeek.count !== 1 ? "s" : ""}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Lucro Mensal</div>
          <div className="kpi-value ok">{fmt(summaryMonth.profit)}</div>
          <div className="kpi-sub">Faturamento: {fmt(summaryMonth.revenue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📦</div>
          <div className="kpi-label">Itens em Estoque</div>
          <div className="kpi-value">{fmtNum(totalStockUnits)}</div>
          <div className="kpi-sub">Custo: {fmt(totalInventoryCost)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">👥</div>
          <div className="kpi-label">Clientes Cadastrados</div>
          <div className="kpi-value">{customers.length}</div>
          <div className="kpi-sub">{inadimplentes.length} inadimplente{inadimplentes.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Charts + Alerts */}
      <div className="grid-3-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Faturamento — Últimos 7 Dias</div>
          <div className="card-subtitle">Evolução diária de receita e lucro</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,148,63,0.12)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7a7060" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7a7060" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e8c470", fontSize: 12 }} />
              <Bar dataKey="faturamento" fill="#b8943f" radius={[4,4,0,0]} name="Faturamento" />
              <Bar dataKey="lucro" fill="#d4a853" radius={[4,4,0,0]} opacity={0.7} name="Lucro" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Alertas</div>
          <div className="card-subtitle">Atenção necessária</div>
          <div className="list">
            {lowStock.length === 0 && inadimplentes.length === 0 && (
              <div className="empty-state" style={{ padding: "1rem" }}>
                <div className="empty-icon">✓</div>
                <p>Nenhum alerta no momento</p>
              </div>
            )}
            {lowStock.map((p: Product) => (
              <div key={p.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => setTab("estoque")}>
                <div className="list-item-main">
                  <div className="list-item-title">⚠ {p.name} · {p.ml}ml</div>
                  <div className="list-item-sub">Estoque baixo: {p.stock} unidade{p.stock !== 1 ? "s" : ""} restante{p.stock !== 1 ? "s" : ""}</div>
                </div>
                <span className="badge badge-warn">Baixo</span>
              </div>
            ))}
            {inadimplentes.map((c: Customer) => (
              <div key={c.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => setTab("clientes")}>
                <div className="list-item-main">
                  <div className="list-item-title">✕ {c.name}</div>
                  <div className="list-item-sub">Cliente inadimplente</div>
                </div>
                <span className="badge badge-danger">Inadimplente</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales + News */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Últimas Vendas</div>
          <div className="card-subtitle">5 mais recentes</div>
          <div className="list">
            {recentSales.length === 0 && <div className="empty-state"><p>Nenhuma venda registrada</p></div>}
            {recentSales.map((s: Sale) => {
              const p = productById[s.productId];
              const c = customerById[s.customerId];
              const total = (s.unitSalePrice * s.quantity) - s.discount;
              return (
                <div key={s.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{p ? `${p.name} · ${p.ml}ml` : "Produto removido"}</div>
                    <div className="list-item-sub">{c?.name ?? "—"} · {fmtDate(s.soldAt)} · {PAY_LABELS[s.paymentMethod]}</div>
                  </div>
                  <span className="badge badge-gold">{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Resumo do Mês</div>
          <div className="card-subtitle">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</div>
          <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.5rem" }}>
            {[
              { label: "Faturamento", value: fmt(summaryMonth.revenue), icon: "💵" },
              { label: "Lucro Estimado", value: fmt(summaryMonth.profit), icon: "📈" },
              { label: "Vendas Realizadas", value: `${summaryMonth.count}`, icon: "🛍" },
              { label: "Produtos Únicos", value: `${products.length}`, icon: "📦" },
              { label: "Faturamento Anual", value: fmt(summaryYear.revenue), icon: "🏆" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.75rem", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{item.icon} {item.label}</span>
                <strong style={{ fontFamily: "var(--font-title)", fontSize: "1.05rem" }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News Rail */}
      {news.length > 0 && (
        <div className="card" style={{ marginTop: "0.5rem" }}>
          <div className="card-title" style={{ marginBottom: "0.75rem" }}>Notícias do Setor</div>
          <div className="news-rail">
            <button className="news-nav" onClick={() => { if (newsScrollRef.current) newsScrollRef.current.scrollBy({ left: -300, behavior: "smooth" }); }}>◀</button>
            <div className="news-scroller" ref={newsScrollRef} onMouseEnter={() => setNewsPaused(true)} onMouseLeave={() => setNewsPaused(false)}>
              <div className="news-track">
                {newsList.map((item: NewsArticle) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="news-card">
                    <div className="news-card-top">
                      <span className="news-badge-tag">{item.source}</span>
                      <span className="news-date">{fmtDate(item.publishedAt)}</span>
                    </div>
                    <div className="news-body">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt="" className="news-thumb" />
                        : <div className="news-thumb" style={{ background: "var(--gold-ghost)", borderRadius: 8 }} />}
                      <div className="news-title">{item.title}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <button className="news-nav" onClick={() => { if (newsScrollRef.current) newsScrollRef.current.scrollBy({ left: 300, behavior: "smooth" }); }}>▶</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ESTOQUE
// ─────────────────────────────────────────────────────────────────────────────

function TabEstoque({ products, setProducts, setSales, lowStock }: any) {
  const [fb, setFb] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = { name: "", brand: "", category: "", ml: "100", stock: "0", stockMin: "5", costPrice: "0", sellPrice: "0" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p: Product) =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, brand: p.brand, category: p.category, ml: String(p.ml), stock: String(p.stock), stockMin: String(p.stockMin), costPrice: String(p.costPrice), sellPrice: String(p.sellPrice) });
    setFb(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFb(null);
    if (!form.name.trim()) { setFb({ kind: "error", text: "Informe o nome do perfume." }); return; }
    const payload = {
      name: form.name.trim(), brand: form.brand.trim(), category: form.category.trim() || "Sem categoria",
      ml: Math.max(1, parseNum(form.ml)), stock: Math.max(0, parseNum(form.stock)),
      stock_min: Math.max(0, parseNum(form.stockMin)),
      cost_price: Math.max(0, parseNum(form.costPrice)), sell_price: Math.max(0, parseNum(form.sellPrice)),
    };
    if (editingId) {
      const { data, error } = await supabase.from("products").update(payload).eq("id", editingId).select("*").single();
      if (error || !data) { setFb({ kind: "error", text: error?.message ?? "Erro ao atualizar." }); return; }
      setProducts((prev: Product[]) => prev.map(p => p.id === editingId ? { ...p, ...payload, stockMin: payload.stock_min, costPrice: payload.cost_price, sellPrice: payload.sell_price } : p));
      setFb({ kind: "ok", text: "Produto atualizado com sucesso." });
      setEditingId(null);
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("*").single();
      if (error || !data) { setFb({ kind: "error", text: error?.message ?? "Erro ao salvar." }); return; }
      setProducts((prev: Product[]) => [{ id: data.id, name: data.name, brand: data.brand ?? "", category: data.category ?? "", ml: Number(data.ml), stock: Number(data.stock), stockMin: Number(data.stock_min ?? 5), costPrice: Number(data.cost_price), sellPrice: Number(data.sell_price) }, ...prev]);
      setFb({ kind: "ok", text: "Produto cadastrado com sucesso." });
    }
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto? As vendas relacionadas também serão removidas.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { setFb({ kind: "error", text: error.message }); return; }
    setProducts((prev: Product[]) => prev.filter(p => p.id !== id));
    setSales((prev: Sale[]) => prev.filter((s: Sale) => s.productId !== id));
  };

  const margin = (p: Product) => p.sellPrice > 0 ? ((p.sellPrice - p.costPrice) / p.sellPrice * 100).toFixed(0) : "0";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Estoque</h2>
          <p className="page-subtitle">{products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}{lowStock.length > 0 ? ` · ${lowStock.length} em alerta` : ""}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: "var(--warn-bg)", border: "1px solid rgba(184,125,42,0.25)", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <span style={{ fontSize: "1.1rem" }}>⚠</span>
          <span style={{ color: "var(--warn)", fontWeight: 600, fontSize: "0.88rem" }}>
            {lowStock.length} produto{lowStock.length > 1 ? "s" : ""} com estoque baixo (≤ 5 unidades): {lowStock.map((p: Product) => `${p.name} · ${p.ml}ml (${p.stock})`).join(", ")}
          </span>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">{editingId ? "Editar Produto" : "Cadastrar Perfume"}</div>
          <div className="card-subtitle">Preencha os dados do produto</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Nome do perfume *</label>
                <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Ex.: Sauvage" />
              </div>
              <div className="field">
                <label>Marca</label>
                <input value={form.brand} onChange={e => upd("brand", e.target.value)} placeholder="Ex.: Dior" />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input value={form.category} onChange={e => upd("category", e.target.value)} placeholder="Ex.: Masculino" />
              </div>
              <div className="field">
                <label>Volume (ml)</label>
                <input type="number" min={1} value={form.ml} onChange={e => upd("ml", e.target.value)} />
              </div>
              <div className="field">
                <label>Estoque atual</label>
                <input type="number" min={0} value={form.stock} onChange={e => upd("stock", e.target.value)} />
              </div>
              <div className="field">
                <label>Estoque mínimo (alerta)</label>
                <input type="number" min={0} value={form.stockMin} onChange={e => upd("stockMin", e.target.value)} />
              </div>
              <div className="field">
                <label>Custo por peça (R$)</label>
                <input type="number" min={0} step="0.01" value={form.costPrice} onChange={e => upd("costPrice", e.target.value)} />
              </div>
              <div className="field span-2">
                <label>Preço de venda (R$)</label>
                <input type="number" min={0} step="0.01" value={form.sellPrice} onChange={e => upd("sellPrice", e.target.value)} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">{editingId ? "Salvar alterações" : "Cadastrar produto"}</button>
              {editingId && <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setFb(null); }}>Cancelar</button>}
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        <div className="card">
          <div className="card-title">Lista de Produtos</div>
          <div className="card-subtitle">Clique em editar para alterar dados</div>
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar por nome, marca ou categoria…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="list" style={{ maxHeight: 480, overflowY: "auto" }}>
            {filtered.length === 0 && <div className="empty-state"><div className="empty-icon">📦</div><p>Nenhum produto encontrado</p></div>}
            {filtered.map((p: Product) => (
              <div key={p.id} className="list-item" style={{ borderColor: p.stock <= p.stockMin ? "rgba(184,125,42,0.35)" : undefined }}>
                <div className="list-item-main">
                  <div className="list-item-title">
                    {p.name}
                    {p.brand && <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.85rem" }}> · {p.brand}</span>}
                    {p.stock <= p.stockMin && <span className="badge badge-warn" style={{ marginLeft: "0.4rem", fontSize: "0.68rem" }}>⚠ Baixo</span>}
                  </div>
                  <div className="list-item-sub">
                    {p.category} · <strong>{p.ml}ml</strong> · Estoque: <strong>{p.stock}</strong> · Venda: {fmt(p.sellPrice)} · Margem: {margin(p)}%
                  </div>
                </div>
                <div className="list-item-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(p)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

function TabClientes({ customers, setCustomers, sales, productById }: any) {
  const [fb, setFb] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const emptyForm = { name: "", status: "ativo" as CustomerStatus, risk: "nunca_deu_problema" as Customer["risk"], origin: "direto" as Customer["origin"], referredBy: "", contact: "", address: "", city: "", neighborhood: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c: Customer) => {
      const matchSearch = c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
      const matchStatus = filterStatus === "todos" || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [customers, search, filterStatus]);

  const customerSales = (id: string) => sales.filter((s: Sale) => s.customerId === id);
  const customerTotal = (id: string) => customerSales(id).reduce((a: number, s: Sale) => a + s.unitSalePrice * s.quantity, 0);

  const handleEdit = (c: Customer) => {
    setEditingId(c.id); setExpandedId(null);
    setForm({ name: c.name, status: c.status, risk: c.risk, origin: c.origin, referredBy: c.referredBy, contact: c.contact, address: c.address, city: c.city, neighborhood: c.neighborhood, notes: c.notes });
    setFb(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFb(null);
    if (!form.name.trim()) { setFb({ kind: "error", text: "Informe o nome do cliente." }); return; }
    const payload = {
      name: form.name.trim(), status: form.status, risk: form.risk, origin: form.origin,
      referred_by: form.referredBy.trim() || null, contact: form.contact.trim(),
      address: form.address.trim(), city: form.city.trim(), neighborhood: form.neighborhood.trim(), notes: form.notes.trim(),
    };
    if (editingId) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editingId);
      if (error) { setFb({ kind: "error", text: error.message }); return; }
      setCustomers((prev: Customer[]) => prev.map(c => c.id === editingId ? { ...c, ...form } : c));
      setFb({ kind: "ok", text: "Cliente atualizado." }); setEditingId(null);
    } else {
      const { data, error } = await supabase.from("customers").insert(payload).select("*").single();
      if (error || !data) { setFb({ kind: "error", text: error?.message ?? "Erro ao salvar." }); return; }
      setCustomers((prev: Customer[]) => [{ id: data.id, ...form, referredBy: form.referredBy }, ...prev]);
      setFb({ kind: "ok", text: "Cliente cadastrado com sucesso." });
    }
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cliente? As vendas relacionadas também serão removidas.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { setFb({ kind: "error", text: error.message }); return; }
    setCustomers((prev: Customer[]) => prev.filter(c => c.id !== id));
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: customers.length, ativo: 0, inadimplente: 0, fiel: 0, vip: 0 };
    customers.forEach((c: Customer) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [customers]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Clientes</h2>
          <p className="page-subtitle">{customers.length} cliente{customers.length !== 1 ? "s" : ""} na carteira</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">{editingId ? "Editar Cliente" : "Cadastrar Cliente"}</div>
          <div className="card-subtitle">Informações do cliente</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Nome completo *</label>
                <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Ex.: Maria Oliveira" />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => upd("status", e.target.value)}>
                  <option value="ativo">✓ Ativo</option>
                  <option value="inadimplente">⚠ Inadimplente</option>
                  <option value="fiel">★ Fiel</option>
                  <option value="vip">♦ VIP</option>
                </select>
              </div>
              <div className="field">
                <label>Histórico</label>
                <select value={form.risk} onChange={e => upd("risk", e.target.value)}>
                  <option value="nunca_deu_problema">Nunca deu problema</option>
                  <option value="ja_deu_problema">Já deu problema</option>
                </select>
              </div>
              <div className="field">
                <label>Origem</label>
                <select value={form.origin} onChange={e => upd("origin", e.target.value)}>
                  <option value="direto">Direto</option>
                  <option value="indicado">Indicado</option>
                </select>
              </div>
              <div className="field">
                <label>Indicado por {form.origin !== "indicado" && "(opcional)"}</label>
                <input value={form.referredBy} onChange={e => upd("referredBy", e.target.value)} placeholder="Nome de quem indicou" disabled={form.origin !== "indicado"} />
              </div>
              <div className="field">
                <label>Contato / WhatsApp</label>
                <input value={form.contact} onChange={e => upd("contact", e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="field">
                <label>Bairro</label>
                <input value={form.neighborhood} onChange={e => upd("neighborhood", e.target.value)} placeholder="Ex.: Centro" />
              </div>
              <div className="field">
                <label>Cidade</label>
                <input value={form.city} onChange={e => upd("city", e.target.value)} placeholder="Ex.: São Paulo" />
              </div>
              <div className="field span-2">
                <label>Endereço</label>
                <input value={form.address} onChange={e => upd("address", e.target.value)} placeholder="Rua, número" />
              </div>
              <div className="field span-2">
                <label>Observações</label>
                <textarea value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Preferências, anotações…" style={{ minHeight: 70 }} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">{editingId ? "Salvar alterações" : "Cadastrar cliente"}</button>
              {editingId && <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setFb(null); }}>Cancelar</button>}
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        <div className="card">
          <div className="card-title">Carteira de Clientes</div>
          <div className="filter-bar" style={{ flexWrap: "wrap" }}>
            <input className="search-input" placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="tab-bar" style={{ marginBottom: 0 }}>
              {(["todos", "ativo", "inadimplente", "fiel", "vip"] as const).map(s => (
                <button key={s} className={`tab-btn ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>
                  {s === "todos" ? `Todos (${statusCounts.todos})` :
                   s === "ativo" ? `Ativos (${statusCounts.ativo || 0})` :
                   s === "inadimplente" ? `⚠ Inad. (${statusCounts.inadimplente || 0})` :
                   s === "fiel" ? `★ Fiéis (${statusCounts.fiel || 0})` :
                   `♦ VIP (${statusCounts.vip || 0})`}
                </button>
              ))}
            </div>
          </div>
          <div className="list" style={{ maxHeight: 520, overflowY: "auto" }}>
            {filtered.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div><p>Nenhum cliente encontrado</p></div>}
            {filtered.map((c: Customer) => (
              <div key={c.id}>
                <div className="list-item" style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <div className="list-item-main">
                    <div className="list-item-title">
                      <span className={`badge ${STATUS_BADGE[c.status]}`} style={{ marginRight: "0.4rem", fontSize: "0.68rem" }}>{STATUS_ICON[c.status]} {STATUS_LABELS[c.status]}</span>
                      {c.name}
                    </div>
                    <div className="list-item-sub">
                      {c.contact || "Sem contato"}
                      {c.city && ` · ${c.neighborhood ? c.neighborhood + ", " : ""}${c.city}`}
                      {c.origin === "indicado" && c.referredBy && <span style={{ color: "var(--info)" }}> · Indicado por {c.referredBy}</span>}
                    </div>
                  </div>
                  <div className="list-item-actions">
                    <span className="badge badge-muted">{fmt(customerTotal(c.id))}</span>
                    <button className="btn btn-ghost btn-icon" title="Expandir">{expandedId === c.id ? "▲" : "▼"}</button>
                  </div>
                </div>
                {expandedId === c.id && (
                  <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderTop: 0, borderRadius: "0 0 10px 10px", padding: "0.75rem 1rem", marginBottom: "0.1rem" }}>
                    {c.risk === "ja_deu_problema" && <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>⚠ Histórico: já deu problema</div>}
                    {c.notes && <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: "0.5rem" }}>📝 {c.notes}</div>}
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                      <strong>Compras ({customerSales(c.id).length}):</strong>
                    </div>
                    <div className="list" style={{ maxHeight: 160, overflowY: "auto" }}>
                      {customerSales(c.id).slice(0, 5).map((s: Sale) => {
                        const p = productById[s.productId];
                        return (
                          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.35rem 0", borderBottom: "1px solid var(--line)" }}>
                            <span>{p ? `${p.name} · ${p.ml}ml` : "—"} · {fmtDate(s.soldAt)}</span>
                            <strong>{fmt(s.unitSalePrice * s.quantity)}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div className="form-actions" style={{ marginTop: "0.6rem" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(c)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Excluir</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: VENDAS
// ─────────────────────────────────────────────────────────────────────────────

function TabVendas({ sales, setSales, products, setProducts, customers, productById, customerById }: any) {
  const [fb, setFb] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const emptyForm = {
    productId: "", customerId: "", quantity: "1",
    paymentMethod: "dinheiro" as PaymentMethod, installments: "1",
    deposit: "0", discount: "0",
    soldAt: new Date().toISOString().slice(0, 10), notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedProduct = productById[form.productId];
  const total = selectedProduct ? (selectedProduct.sellPrice * parseNum(form.quantity)) - parseNum(form.discount) : 0;
  const isParcelado = form.paymentMethod === "cartao_parcelado";

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter((s: Sale) => {
      const p = productById[s.productId];
      const c = customerById[s.customerId];
      return !q || (p?.name ?? "").toLowerCase().includes(q) || (c?.name ?? "").toLowerCase().includes(q);
    });
  }, [sales, search, productById, customerById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFb(null);
    const qty = Math.max(1, parseNum(form.quantity));
    const installments = isParcelado ? Math.max(1, parseNum(form.installments)) : 1;
    const deposit = Math.max(0, parseNum(form.deposit));
    const discount = Math.max(0, parseNum(form.discount));

    if (!selectedProduct) { setFb({ kind: "error", text: "Selecione um produto." }); return; }
    if (!form.customerId) { setFb({ kind: "error", text: "Selecione um cliente." }); return; }
    if (selectedProduct.stock < qty) { setFb({ kind: "error", text: `Estoque insuficiente. Disponível: ${selectedProduct.stock}` }); return; }

    const payload = {
      product_id: selectedProduct.id, customer_id: form.customerId, quantity: qty,
      payment_method: form.paymentMethod, installments, deposit, discount,
      unit_sale_price: selectedProduct.sellPrice, unit_cost_price: selectedProduct.costPrice,
      sold_at: form.soldAt, notes: form.notes.trim(),
    };
    const { data, error } = await supabase.from("sales").insert(payload).select("*").single();
    if (error || !data) { setFb({ kind: "error", text: error?.message ?? "Erro ao registrar venda." }); return; }

    const newStock = selectedProduct.stock - qty;
    await supabase.from("products").update({ stock: newStock }).eq("id", selectedProduct.id);

    setSales((prev: Sale[]) => [{ id: data.id, productId: data.product_id, customerId: data.customer_id, quantity: qty, paymentMethod: data.payment_method as PaymentMethod, installments, deposit, discount, unitSalePrice: data.unit_sale_price, unitCostPrice: data.unit_cost_price, soldAt: data.sold_at, notes: data.notes ?? "" }, ...prev]);
    setProducts((prev: Product[]) => prev.map((p: Product) => p.id === selectedProduct.id ? { ...p, stock: newStock } : p));

    const customer = customerById[form.customerId];
    setFb({ kind: "ok", text: `Venda registrada para ${customer?.name ?? "cliente"}. Estoque atualizado.` });
    setForm(f => ({ ...f, quantity: "1", installments: "1", deposit: "0", discount: "0", notes: "" }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Vendas</h2>
          <p className="page-subtitle">{sales.length} venda{sales.length !== 1 ? "s" : ""} registrada{sales.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Registrar Venda</div>
          <div className="card-subtitle">Baixa automática no estoque</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Produto *</label>
                <select value={form.productId} onChange={e => upd("productId", e.target.value)}>
                  <option value="">Selecione o produto…</option>
                  {products.map((p: Product) => (
                    <option key={p.id} value={p.id} disabled={p.stock === 0}>
                      {p.name}{p.brand ? ` (${p.brand})` : ""} · {p.ml}ml · {fmt(p.sellPrice)} · Estoque: {p.stock}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field span-2">
                <label>Cliente *</label>
                <select value={form.customerId} onChange={e => upd("customerId", e.target.value)}>
                  <option value="">Selecione o cliente…</option>
                  {customers.map((c: Customer) => (
                    <option key={c.id} value={c.id}>
                      {STATUS_ICON[c.status]} {c.name}{c.contact ? ` · ${c.contact}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input type="number" min={1} value={form.quantity} onChange={e => upd("quantity", e.target.value)} />
              </div>
              <div className="field">
                <label>Data da venda</label>
                <input type="date" value={form.soldAt} onChange={e => upd("soldAt", e.target.value)} />
              </div>
              <div className="field">
                <label>Forma de pagamento</label>
                <select value={form.paymentMethod} onChange={e => upd("paymentMethod", e.target.value)}>
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">⚡ Pix</option>
                  <option value="cartao_avista">💳 Cartão à vista</option>
                  <option value="cartao_parcelado">💳 Cartão parcelado</option>
                </select>
              </div>
              <div className="field">
                <label>Parcelas {!isParcelado && "(só cartão parcelado)"}</label>
                <select value={form.installments} onChange={e => upd("installments", e.target.value)} disabled={!isParcelado}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x{n > 1 && selectedProduct ? ` de ${fmt((selectedProduct.sellPrice * parseNum(form.quantity) - parseNum(form.discount)) / n)}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Desconto (R$)</label>
                <input type="number" min={0} step="0.01" value={form.discount} onChange={e => upd("discount", e.target.value)} />
              </div>
              <div className="field">
                <label>Sinal / Entrada (R$)</label>
                <input type="number" min={0} step="0.01" value={form.deposit} onChange={e => upd("deposit", e.target.value)} />
              </div>
              <div className="field span-2">
                <label>Observações</label>
                <input value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Anotações sobre a venda…" />
              </div>
            </div>
            {selectedProduct && (
              <div style={{ background: "var(--gold-ghost)", border: "1px solid var(--gold-border)", borderRadius: 10, padding: "0.7rem 0.9rem", marginTop: "0.75rem", fontSize: "0.88rem" }}>
                <strong>Total da venda: {fmt(total)}</strong>
                {isParcelado && parseNum(form.installments) > 1 && <span style={{ color: "var(--muted)" }}> · {form.installments}x de {fmt(total / parseNum(form.installments))}</span>}
                {parseNum(form.deposit) > 0 && <span style={{ color: "var(--muted)" }}> · Restante: {fmt(total - parseNum(form.deposit))}</span>}
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Registrar venda</button>
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        <div className="card">
          <div className="card-title">Histórico de Vendas</div>
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar por produto ou cliente…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="list" style={{ maxHeight: 540, overflowY: "auto" }}>
            {filteredSales.length === 0 && <div className="empty-state"><div className="empty-icon">🛍</div><p>Nenhuma venda encontrada</p></div>}
            {filteredSales.map((s: Sale) => {
              const p = productById[s.productId];
              const c = customerById[s.customerId];
              const total = s.unitSalePrice * s.quantity - s.discount;
              const profit = (s.unitSalePrice - s.unitCostPrice) * s.quantity - s.discount;
              return (
                <div key={s.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{p ? `${p.name} · ${p.ml}ml` : "Produto removido"}</div>
                    <div className="list-item-sub">
                      {c?.name ?? "—"} · {fmtDate(s.soldAt)} · {PAY_LABELS[s.paymentMethod]}
                      {s.paymentMethod === "cartao_parcelado" && s.installments > 1 && ` ${s.installments}x`}
                      {s.deposit > 0 && ` · Sinal: ${fmt(s.deposit)}`}
                      {s.discount > 0 && ` · Desc.: ${fmt(s.discount)}`}
                    </div>
                    {s.notes && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.15rem" }}>📝 {s.notes}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                    <span className="badge badge-gold">{fmt(total)}</span>
                    <span style={{ fontSize: "0.72rem", color: profit >= 0 ? "var(--ok)" : "var(--danger)" }}>Lucro: {fmt(profit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: FINANCEIRO
// ─────────────────────────────────────────────────────────────────────────────

function TabFinanceiro({ sales, products, customers, productById, customerById, summaryWeek, summaryMonth, summaryQuarter, summaryYear }: any) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  const summaries = { week: summaryWeek, month: summaryMonth, quarter: summaryQuarter, year: summaryYear };
  const current = summaries[period];
  const periodLabel = { week: "Semana", month: "Mês", quarter: "Trimestre", year: "Ano" };

  // Last 12 months chart
  const monthlyData = useMemo(() => {
    const months: { mes: string; faturamento: number; lucro: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const monthSales = sales.filter((s: Sale) => s.soldAt.startsWith(key));
      const faturamento = monthSales.reduce((a: number, s: Sale) => a + s.unitSalePrice * s.quantity, 0);
      const lucro = monthSales.reduce((a: number, s: Sale) => a + (s.unitSalePrice - s.unitCostPrice) * s.quantity, 0);
      months.push({ mes: label, faturamento, lucro });
    }
    return months;
  }, [sales]);

  // Payment method pie
  const paymentData = useMemo(() => {
    const acc: Record<string, number> = {};
    sales.forEach((s: Sale) => { acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.unitSalePrice * s.quantity; });
    return Object.entries(acc).map(([key, value]) => ({ name: PAY_LABELS[key as PaymentMethod] ?? key, value }));
  }, [sales]);

  // Top products
  const topProducts = useMemo(() => {
    const acc: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.forEach((s: Sale) => {
      const p = productById[s.productId];
      if (!p) return;
      const key = `${p.name} · ${p.ml}ml`;
      if (!acc[key]) acc[key] = { name: key, qty: 0, revenue: 0 };
      acc[key].qty += s.quantity;
      acc[key].revenue += s.unitSalePrice * s.quantity;
    });
    return Object.values(acc).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [sales, productById]);

  // Top customers
  const topCustomers = useMemo(() => {
    const acc: Record<string, { name: string; total: number; count: number }> = {};
    sales.forEach((s: Sale) => {
      const c = customerById[s.customerId];
      if (!c) return;
      if (!acc[c.id]) acc[c.id] = { name: c.name, total: 0, count: 0 };
      acc[c.id].total += s.unitSalePrice * s.quantity;
      acc[c.id].count += s.quantity;
    });
    return Object.values(acc).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [sales, customerById]);

  // Region/city data
  const regionData = useMemo(() => {
    const acc: Record<string, number> = {};
    sales.forEach((s: Sale) => {
      const c = customerById[s.customerId];
      const region = c?.city || c?.neighborhood || "Não informado";
      acc[region] = (acc[region] || 0) + s.unitSalePrice * s.quantity;
    });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [sales, customerById]);

  const margin = current.revenue > 0 ? ((current.profit / current.revenue) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Financeiro</h2>
          <p className="page-subtitle">Análise de desempenho e resultados</p>
        </div>
        <div className="tab-bar">
          {(["week", "month", "quarter", "year"] as const).map(p => (
            <button key={p} className={`tab-btn ${period === p ? "active" : ""}`} onClick={() => setPeriod(p)}>{periodLabel[p]}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="kpi-card">
          <div className="kpi-icon">💵</div>
          <div className="kpi-label">Faturamento · {periodLabel[period]}</div>
          <div className="kpi-value gold">{fmt(current.revenue)}</div>
          <div className="kpi-sub">{current.count} vendas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📈</div>
          <div className="kpi-label">Lucro · {periodLabel[period]}</div>
          <div className="kpi-value ok">{fmt(current.profit)}</div>
          <div className="kpi-sub">Margem: {margin}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🏆</div>
          <div className="kpi-label">Faturamento Anual</div>
          <div className="kpi-value">{fmt(summaryYear.revenue)}</div>
          <div className="kpi-sub">Lucro: {fmt(summaryYear.profit)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-label">Ticket Médio</div>
          <div className="kpi-value">{current.count > 0 ? fmt(current.revenue / current.count) : "R$ —"}</div>
          <div className="kpi-sub">por venda no período</div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Evolução — Últimos 12 Meses</div>
          <div className="card-subtitle">Faturamento vs. Lucro mensal</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,148,63,0.12)" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#7a7060" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#7a7060" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="faturamento" stroke="#b8943f" strokeWidth={2.5} dot={false} name="Faturamento" />
              <Line type="monotone" dataKey="lucro" stroke="#1e7c5a" strokeWidth={2} dot={false} name="Lucro" strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Formas de Pagamento</div>
          <div className="card-subtitle">Distribuição por volume (R$)</div>
          {paymentData.length === 0
            ? <div className="empty-state"><p>Nenhuma venda registrada</p></div>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {paymentData.map((_: any, i: number) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Produtos Mais Vendidos</div>
          <div className="card-subtitle">Por faturamento total</div>
          {topProducts.length === 0
            ? <div className="empty-state"><p>Nenhuma venda registrada</p></div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,148,63,0.10)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#7a7060" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: "#3d3830" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#b8943f" radius={[0,4,4,0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>}
        </div>

        <div className="card">
          <div className="card-title">Clientes que Mais Compram</div>
          <div className="card-subtitle">Por valor total</div>
          {topCustomers.length === 0
            ? <div className="empty-state"><p>Nenhuma venda registrada</p></div>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCustomers} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,79,0.08)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#7a7060" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#3d3830" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="total" fill="#2d5470" radius={[0,4,4,0]} name="Total gasto" />
                </BarChart>
              </ResponsiveContainer>}
        </div>
      </div>

      {/* Region */}
      <div className="card">
        <div className="card-title">Vendas por Região / Cidade</div>
        <div className="card-subtitle">Distribuição geográfica dos clientes</div>
        {regionData.length === 0
          ? <div className="empty-state"><p>Cadastre cidades nos clientes para ver este relatório</p></div>
          : <ResponsiveContainer width="100%" height={200}>
              <BarChart data={regionData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,148,63,0.10)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#7a7060" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#7a7060" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4,4,0,0]} name="Faturamento">
                  {regionData.map((_: any, i: number) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: INVESTIMENTOS
// ─────────────────────────────────────────────────────────────────────────────

function TabInvestimentos({ news }: { news: NewsArticle[] }) {
  const [quotes, setQuotes] = useState<any>(null);
  const [selic, setSelic] = useState<number | null>(null);
  const [simValue, setSimValue] = useState("1000");
  const [simMonths, setSimMonths] = useState("12");
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usdRes, eurRes, btcRes] = await Promise.all([
          fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL"),
          fetch("https://economia.awesomeapi.com.br/json/last/EUR-BRL"),
          fetch("https://economia.awesomeapi.com.br/json/last/BTC-BRL"),
        ]);
        const [usdData, eurData, btcData] = await Promise.all([usdRes.json(), eurRes.json(), btcRes.json()]);
        setQuotes({ usd: usdData.USDBRL, eur: eurData.EURBRL, btc: btcData.BTCBRL });
      } catch { /* offline */ }
      try {
        const selicRes = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json");
        const selicData = await selicRes.json();
        if (selicData?.[0]?.valor) setSelic(parseFloat(selicData[0].valor.replace(",", ".")));
      } catch { /* offline */ }
      setLoadingQuotes(false);
    };
    fetchData();
  }, []);

  const value = parseNum(simValue);
  const months = parseNum(simMonths);

  // Rates (approximate, based on typical Brazilian rates)
  const selicAnual = selic ? selic * 12 : 10.5;
  const cdiAnual = selicAnual - 0.1;
  const poupancaAnual = selicAnual > 8.5 ? 0.5 * 12 + 0.1175 * 12 : selicAnual * 0.7;

  const calcCompound = (principal: number, annualRate: number, months: number) =>
    principal * Math.pow(1 + annualRate / 100 / 12, months) - principal;

  const investments = [
    { name: "Poupança", rate: poupancaAnual, color: "#2d5470", icon: "🏦", desc: "Rendimento mensal, sem IR" },
    { name: "CDB 100% CDI", rate: cdiAnual * 0.85, color: "#b8943f", icon: "📄", desc: "Após IR 15% (longo prazo)" },
    { name: "Tesouro Selic", rate: (selicAnual - 0.1) * 0.85, color: "#1e7c5a", icon: "🏛", desc: "Após IR 15%, liquidez diária" },
    { name: "CDB 120% CDI", rate: cdiAnual * 1.2 * 0.85, color: "#c44040", icon: "💎", desc: "Após IR 15% (prazo definido)" },
  ];

  const chartData = [3, 6, 12, 24, 36].map(m => {
    const obj: any = { meses: `${m}m` };
    investments.forEach(inv => { obj[inv.name] = calcCompound(value, inv.rate, m); });
    return obj;
  });

  const fmtRate = (r: number) => `${r.toFixed(2)}% a.a.`;
  const fmtQ = (v: string | undefined) => v ? parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "—";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Investimentos</h2>
          <p className="page-subtitle">Cotações em tempo real e simulador financeiro</p>
        </div>
      </div>

      {/* Quotes */}
      <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="kpi-card">
          <div className="kpi-icon">🇺🇸</div>
          <div className="kpi-label">Dólar (USD)</div>
          <div className="kpi-value gold">{loadingQuotes ? "…" : `R$ ${fmtQ(quotes?.usd?.ask)}`}</div>
          <div className="kpi-sub" style={{ color: quotes?.usd?.pctChange > 0 ? "var(--ok)" : "var(--danger)" }}>
            {quotes?.usd?.pctChange ? `${quotes.usd.pctChange > 0 ? "▲" : "▼"} ${Math.abs(quotes.usd.pctChange)}%` : "Tempo real"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🇪🇺</div>
          <div className="kpi-label">Euro (EUR)</div>
          <div className="kpi-value">{loadingQuotes ? "…" : `R$ ${fmtQ(quotes?.eur?.ask)}`}</div>
          <div className="kpi-sub" style={{ color: quotes?.eur?.pctChange > 0 ? "var(--ok)" : "var(--danger)" }}>
            {quotes?.eur?.pctChange ? `${quotes.eur.pctChange > 0 ? "▲" : "▼"} ${Math.abs(quotes.eur.pctChange)}%` : "Tempo real"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">₿</div>
          <div className="kpi-label">Bitcoin (BTC)</div>
          <div className="kpi-value" style={{ fontSize: "1.4rem" }}>{loadingQuotes ? "…" : `R$ ${fmtQ(quotes?.btc?.ask)}`}</div>
          <div className="kpi-sub" style={{ color: quotes?.btc?.pctChange > 0 ? "var(--ok)" : "var(--danger)" }}>
            {quotes?.btc?.pctChange ? `${quotes.btc.pctChange > 0 ? "▲" : "▼"} ${Math.abs(quotes.btc.pctChange)}%` : "Tempo real"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">🏦</div>
          <div className="kpi-label">Selic (Banco Central)</div>
          <div className="kpi-value ok">{selic != null ? `${(selic * 12).toFixed(2)}% a.a.` : loadingQuotes ? "…" : "10.50% a.a."}</div>
          <div className="kpi-sub">Taxa básica de juros</div>
        </div>
      </div>

      {/* Simulator */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-title">Simulador de Investimentos</div>
          <div className="card-subtitle">Baseado nas taxas atuais do mercado brasileiro</div>
          <div className="form-grid" style={{ marginBottom: "1rem" }}>
            <div className="field">
              <label>Valor a investir (R$)</label>
              <input type="number" min={0} step="100" value={simValue} onChange={e => setSimValue(e.target.value)} />
            </div>
            <div className="field">
              <label>Prazo (meses)</label>
              <select value={simMonths} onChange={e => setSimMonths(e.target.value)}>
                {[1,3,6,12,18,24,36,48,60].map(m => <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}{m === 12 ? " (1 ano)" : m === 24 ? " (2 anos)" : m === 36 ? " (3 anos)" : ""}</option>)}
              </select>
            </div>
          </div>
          <div className="list">
            {investments.map(inv => {
              const rendimento = calcCompound(value, inv.rate, months);
              const total = value + rendimento;
              return (
                <div key={inv.name} className="list-item">
                  <div style={{ fontSize: "1.4rem", marginRight: "0.5rem" }}>{inv.icon}</div>
                  <div className="list-item-main">
                    <div className="list-item-title" style={{ color: inv.color }}>{inv.name}</div>
                    <div className="list-item-sub">{fmtRate(inv.rate)} · {inv.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", color: inv.color, fontWeight: 700 }}>{fmt(total)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ok)" }}>+{fmt(rendimento)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Crescimento por Prazo</div>
          <div className="card-subtitle">Rendimento acumulado (R$) para {fmt(value)} investidos</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,148,63,0.12)" />
              <XAxis dataKey="meses" tick={{ fontSize: 11, fill: "#7a7060" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7a7060" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {investments.map(inv => (
                <Line key={inv.name} type="monotone" dataKey={inv.name} stroke={inv.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* News financial */}
      {news.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: "0.75rem" }}>Notícias Financeiras</div>
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {news.slice(0, 8).map((item: NewsArticle) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="list-item" style={{ textDecoration: "none" }}>
                <div className="list-item-main">
                  <div className="list-item-title">{item.title}</div>
                  <div className="list-item-sub">{item.source} · {fmtDate(item.publishedAt)}</div>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--gold)" }}>→</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
