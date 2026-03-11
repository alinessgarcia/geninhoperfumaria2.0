"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import type { NewsArticle } from "./types";
import { fmt, parseNum, fmtDate } from "./helpers";

export function TabInvestimentos({ news }: { news: NewsArticle[] }) {
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
              <Tooltip formatter={(v?: number) => fmt(v ?? 0)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
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
