"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import type { Product, Customer, Sale, NewsArticle, Tab, Summary } from "./types";
import { fmt, fmtNum, fmtDate, PAY_LABELS } from "./helpers";

type Props = {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  news: NewsArticle[];
  summaryWeek: Summary;
  summaryMonth: Summary;
  summaryYear: Summary;
  lowStock: Product[];
  inadimplentes: Customer[];
  totalStockUnits: number;
  totalInventoryCost: number;
  setTab: (t: Tab) => void;
  productById: Record<string, Product>;
  customerById: Record<string, Customer>;
};

export function TabDashboard({ products, customers, sales, news, summaryWeek, summaryMonth, summaryYear, lowStock, inadimplentes, totalStockUnits, totalInventoryCost, setTab, productById, customerById }: Props) {
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
              <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ borderRadius: 10, border: "1px solid #e8c470", fontSize: 12 }} />
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
