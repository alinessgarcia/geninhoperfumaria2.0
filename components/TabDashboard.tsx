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
          <div className="kpi-label">Faturamento Semanal</div>
          <div className="kpi-value gold">{fmt(summaryWeek.revenue)}</div>
          <div className="kpi-sub">{summaryWeek.count} venda{summaryWeek.count !== 1 ? "s" : ""}</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>💰</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Lucro Mensal</div>
          <div className="kpi-value ok">{fmt(summaryMonth.profit)}</div>
          <div className="kpi-sub">Faturamento: {fmt(summaryMonth.revenue)}</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>📈</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Itens em Estoque</div>
          <div className="kpi-value">{fmtNum(totalStockUnits)}</div>
          <div className="kpi-sub">Custo: {fmt(totalInventoryCost)}</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>📦</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Clientes Cadastrados</div>
          <div className="kpi-value" style={{ color: "var(--text)" }}>{customers.length}</div>
          <div className="kpi-sub">{inadimplentes.length} inadimplente{inadimplentes.length !== 1 ? "s" : ""}</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>👥</div>
        </div>
      </div>

      {/* Charts + Alerts */}
      <div className="grid-3-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3 className="card-title">Faturamento — Últimos 7 Dias</h3>
          <p className="card-subtitle">Evolução diária de receita e lucro</p>
          <div style={{ height: 200, marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} cursor={{ fill: "var(--gold-ghost)" }} />
                <Bar dataKey="faturamento" fill="var(--gold)" radius={[2,2,0,0]} name="Faturamento" />
                <Bar dataKey="lucro" fill="var(--emerald-light)" radius={[2,2,0,0]} opacity={0.6} name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Alertas Críticos</h3>
          <p className="card-subtitle">Ação imediata requerida</p>
          <div className="list">
            {lowStock.length === 0 && inadimplentes.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--ok)", border: "1px dashed var(--ok)", background: "rgba(6,95,70,0.05)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>✓</div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>Tudo pronto</p>
                <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Nenhum alerta pendente</p>
              </div>
            )}
            {lowStock.map((p: Product) => (
              <div key={p.id} className="list-item" style={{ cursor: "pointer", borderLeft: "3px solid var(--warn)", background: "rgba(180,83,9,0.03)", marginBottom: "0.5rem" }} onClick={() => setTab("estoque")}>
                <div>
                  <div className="list-item-title">{p.name} <span style={{ opacity: 0.5, fontWeight: 400 }}>· {p.ml}ml</span></div>
                  <div className="list-item-sub">Restante: {p.stock} un.</div>
                </div>
                <span className="badge badge-warn">Estoque Baixo</span>
              </div>
            ))}
            {inadimplentes.map((c: Customer) => (
              <div key={c.id} className="list-item" style={{ cursor: "pointer", borderLeft: "3px solid var(--danger)", background: "rgba(155,28,28,0.03)", marginBottom: "0.5rem" }} onClick={() => setTab("clientes")}>
                <div>
                  <div className="list-item-title">{c.name}</div>
                  <div className="list-item-sub">Inadimplente</div>
                </div>
                <span className="badge badge-danger">Risco Alto</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales + News */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3 className="card-title">Vendas Recentes</h3>
          <p className="card-subtitle">Últimas movimentações</p>
          <div className="list">
            {recentSales.length === 0 && <div className="empty-state"><p>Nenhuma venda registrada</p></div>}
            {recentSales.map((s: Sale) => {
              const p = productById[s.productId];
              const c = customerById[s.customerId];
              const total = (s.unitSalePrice * s.quantity) - s.discount;
              return (
                <div key={s.id} className="list-item" style={{ padding: "0.75rem 0" }}>
                  <div>
                    <div className="list-item-title" style={{ fontSize: "0.9rem" }}>{p ? `${p.name} · ${p.ml}ml` : "Produto removido"}</div>
                    <div className="list-item-sub">{c?.name ?? "—"} · {fmtDate(s.soldAt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: "0.95rem" }}>{fmt(total)}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase" }}>{PAY_LABELS[s.paymentMethod]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Performance</h3>
          <p className="card-subtitle">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
            {[
              { label: "Faturamento", value: fmt(summaryMonth.revenue), icon: "◈", color: "var(--gold)" },
              { label: "Lucro Estimado", value: fmt(summaryMonth.profit), icon: "◈", color: "var(--emerald-light)" },
              { label: "Volume de Vendas", value: `${summaryMonth.count} un.`, icon: "◈", color: "var(--text)" },
              { label: "Estoque (Custo)", value: fmt(totalInventoryCost), icon: "◈", color: "var(--muted)" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                </div>
                <strong style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", color: item.color === "var(--text)" ? "inherit" : item.color }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News Rail */}
      {news.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 className="card-title" style={{ marginBottom: "1rem" }}>Insight do Setor</h3>
          <div className="news-rail">
            <div className="news-scroller" ref={newsScrollRef} onMouseEnter={() => setNewsPaused(true)} onMouseLeave={() => setNewsPaused(false)}>
              <div className="news-track" style={{ display: "flex", gap: "1.5rem" }}>
                {newsList.map((item: NewsArticle) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="news-card" style={{ minWidth: "320px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--line)", padding: "1.25rem" }}>
                    <div className="news-card-top" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>{item.source}</span>
                      <span>{fmtDate(item.publishedAt)}</span>
                    </div>
                    {item.imageUrl && (
                      <div style={{ height: "140px", overflow: "hidden", marginBottom: "1rem", border: "1px solid var(--line)" }}>
                        <img src={item.imageUrl} alt="" className="news-thumb" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                      </div>
                    )}
                    <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{item.title}</h4>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
