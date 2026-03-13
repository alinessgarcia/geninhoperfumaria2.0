"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { NewsArticle } from "./types";
import { fmt, parseNum, fmtDate } from "./helpers";

export function TabInvestimentos({ news }: { news: NewsArticle[] }) {
  const [quotes, setQuotes] = useState<Record<string, any> | null>(null);
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
    const obj: Record<string, string | number> = { meses: `${m}m` };
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
          <div className="kpi-label">Dólar Americano</div>
          <div className="kpi-value gold" style={{ fontSize: "1.25rem" }}>
            {loadingQuotes ? "Carregando..." : `R$ ${fmtQ(quotes?.usd?.ask)}`}
          </div>
          <div className="kpi-sub" style={{ color: quotes?.usd?.pctChange > 0 ? "var(--emerald-light)" : "var(--warn)" }}>
            {quotes?.usd?.pctChange ? `${quotes.usd.pctChange > 0 ? "▲" : "▼"} ${Math.abs(quotes.usd.pctChange)}%` : "USD/BRL"}
          </div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "1.5rem" }}>🇺🇸</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Euro</div>
          <div className="kpi-value" style={{ fontSize: "1.25rem", color: "var(--text)" }}>
            {loadingQuotes ? "Carregando..." : `R$ ${fmtQ(quotes?.eur?.ask)}`}
          </div>
          <div className="kpi-sub" style={{ color: quotes?.eur?.pctChange > 0 ? "var(--emerald-light)" : "var(--warn)" }}>
            {quotes?.eur?.pctChange ? `${quotes.eur.pctChange > 0 ? "▲" : "▼"} ${Math.abs(quotes.eur.pctChange)}%` : "EUR/BRL"}
          </div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "1.5rem" }}>🇪🇺</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bitcoin</div>
          <div className="kpi-value" style={{ fontSize: "1.1rem", color: "var(--text)" }}>
            {loadingQuotes ? "Carregando..." : `R$ ${fmtQ(quotes?.btc?.ask)}`}
          </div>
          <div className="kpi-sub" style={{ color: quotes?.btc?.pctChange > 0 ? "var(--emerald-light)" : "var(--warn)" }}>
            {quotes?.btc?.pctChange ? `${quotes.btc.pctChange > 0 ? "▲" : "▼"} ${Math.abs(quotes.btc.pctChange)}%` : "BTC/BRL"}
          </div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "1.5rem" }}>₿</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">SELIC Atual</div>
          <div className="kpi-value ok" style={{ fontSize: "1.25rem" }}>
            {selic != null ? `${(selic * 12).toFixed(2)}%` : loadingQuotes ? "..." : "10.50%"}
          </div>
          <div className="kpi-sub">Taxa Banco Central</div>
          <div style={{ position: "absolute", right: "1.25rem", bottom: "1.25rem", opacity: 0.15, fontSize: "1.5rem" }}>🏛</div>
        </div>
      </div>

      {/* Simulator */}
      <div className="grid-2" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h3 className="card-title">Simulador Financeiro</h3>
          <p className="card-subtitle">Estimativas baseadas em taxas vigentes</p>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Aporte (R$)</label>
              <input type="number" min={0} step="100" value={simValue} onChange={e => setSimValue(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Prazo</label>
              <select value={simMonths} onChange={e => setSimMonths(e.target.value)}>
                {[1,3,6,12,18,24,36,48,60].map(m => <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>)}
              </select>
            </div>
          </div>
          <div className="list" style={{ marginTop: "1.5rem" }}>
            {investments.map(inv => {
              const rendimento = calcCompound(value, inv.rate, months);
              const total = value + rendimento;
              return (
                <div key={inv.name} className="list-item">
                  <div style={{ flex: 1 }}>
                    <div className="list-item-title" style={{ fontWeight: 700, color: "var(--text)" }}>{inv.name}</div>
                    <div className="list-item-sub">{fmtRate(inv.rate)} · {inv.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "var(--gold)" }}>{fmt(total)}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--emerald-light)" }}>+{fmt(rendimento)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Projeção de Longo Prazo</h3>
          <p className="card-subtitle">Crescimento acumulado para {fmt(value)}</p>
          <div style={{ height: 300, marginTop: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="meses" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: any) => fmt(Number(v) || 0)} contentStyle={{ background: "var(--bg-sidebar)", border: "1px solid var(--line)", borderRadius: 0, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: "1rem" }} />
                {investments.map(inv => (
                  <Line key={inv.name} type="monotone" dataKey={inv.name} stroke={inv.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
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
