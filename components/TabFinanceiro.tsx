"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { Product, Customer, Sale, PaymentMethod, Summary } from "./types";
import { fmt, PAY_LABELS, GOLD_PALETTE } from "./helpers";

type Props = {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  productById: Record<string, Product>;
  customerById: Record<string, Customer>;
  summaryWeek: Summary;
  summaryMonth: Summary;
  summaryQuarter: Summary;
  summaryYear: Summary;
};

export function TabFinanceiro({ sales, products, customers, productById, customerById, summaryWeek, summaryMonth, summaryQuarter, summaryYear }: Props) {
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
          <div className="kpi-label">Faturamento · {periodLabel[period]}</div>
          <div className="kpi-value gold">{fmt(current.revenue)}</div>
          <div className="kpi-sub">{current.count} vendas</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>💵</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Lucro · {periodLabel[period]}</div>
          <div className="kpi-value ok">{fmt(current.profit)}</div>
          <div className="kpi-sub">Margem: {margin}%</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>📈</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Faturamento Anual</div>
          <div className="kpi-value">{fmt(summaryYear.revenue)}</div>
          <div className="kpi-sub">Lucro: {fmt(summaryYear.profit)}</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>🏆</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket Médio</div>
          <div className="kpi-value" style={{ color: "var(--text)" }}>{current.count > 0 ? fmt(current.revenue / current.count) : "R$ —"}</div>
          <div className="kpi-sub">por venda no período</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "2rem" }}>🎯</div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3 className="card-title">Evolução — Últimos 12 Meses</h3>
          <p className="card-subtitle">Faturamento vs. Lucro mensal</p>
          <div style={{ height: 220, marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.08)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: "1rem" }} />
                <Line type="monotone" dataKey="faturamento" stroke="var(--gold)" strokeWidth={3} dot={false} name="Faturamento" />
                <Line type="monotone" dataKey="lucro" stroke="var(--emerald-light)" strokeWidth={2} dot={false} name="Lucro" strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Fontes de Receita</h3>
          <p className="card-subtitle">Distribuição por forma de pagamento</p>
          <div style={{ height: 220, marginTop: "1rem" }}>
            {paymentData.length === 0
              ? <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: "0.85rem" }}>Nenhum dado disponível</div>
              : <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10, fill: "var(--text)" }}>
                      {paymentData.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} stroke="rgba(255,255,255,0.05)" />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3 className="card-title">Ranking de Produtos</h3>
          <p className="card-subtitle">Top 6 por faturamento total</p>
          <div style={{ height: 220, marginTop: "1rem" }}>
            {topProducts.length === 0
              ? <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: "0.85rem" }}>Nenhum dado disponível</div>
              : <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="var(--gold)" radius={[0,2,2,0]} name="Faturamento" />
                  </BarChart>
                </ResponsiveContainer>}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Principais Clientes</h3>
          <p className="card-subtitle">Por volume de compras (R$)</p>
          <div style={{ height: 220, marginTop: "1rem" }}>
            {topCustomers.length === 0
              ? <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: "0.85rem" }}>Nenhum dado disponível</div>
              : <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} />
                    <Bar dataKey="total" fill="var(--emerald-light)" radius={[0,2,2,0]} name="Total gasto" />
                  </BarChart>
                </ResponsiveContainer>}
          </div>
        </div>
      </div>

      {/* Region */}
      <div className="card">
        <h3 className="card-title">Distribuição Geográfica</h3>
        <p className="card-subtitle">Vendas por cidade ou bairro</p>
        <div style={{ height: 200, marginTop: "1rem" }}>
          {regionData.length === 0
            ? <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)", fontSize: "0.85rem" }}>Nenhum dado disponível</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[2,2,0,0]} name="Faturamento">
                    {regionData.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
        </div>
      </div>
    </div>
  );
}
