"use client";

import { useMemo, useState } from "react";
import type { NewsArticle } from "./types";
import { fmtDate } from "./helpers";

export function TabNoticias({ news }: { news: NewsArticle[] }) {
  const [filter, setFilter] = useState<string>("todas");

  const categories = ["todas", "lançamentos", "tendências", "dicas"];

  const filteredNews = useMemo(() => {
    if (filter === "todas") return news;
    return news.filter((item) => {
      const text = `${item.title} ${item.source}`.toLowerCase();
      if (filter === "lançamentos") return text.includes("lançamento") || text.includes("novo") || text.includes("chegou");
      if (filter === "tendências") return text.includes("tendência") || text.includes("verão") || text.includes("inverno") || text.includes("alta");
      if (filter === "dicas") return text.includes("dica") || text.includes("melhores") || text.includes("top");
      return true;
    });
  }, [news, filter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Mundo da Perfumaria</h2>
          <p className="page-subtitle">Principais notícias, lançamentos e tendências do mercado</p>
        </div>
      </div>

      <div style={{ margin: "1.25rem 0", display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--line)", paddingBottom: "1rem" }}>
        {categories.map(c => (
          <button 
            key={c} 
            onClick={() => setFilter(c)} 
            style={{ 
              background: filter === c ? "var(--gold)" : "rgba(255,255,255,0.03)",
              color: filter === c ? "var(--bg-sidebar)" : "var(--muted)",
              border: filter === c ? "none" : "1px solid var(--line)", 
              padding: "0.5rem 1rem", 
              fontSize: "0.75rem", 
              fontWeight: 700, 
              cursor: "pointer", 
              textTransform: "uppercase",
              borderRadius: "4px",
              transition: "all 0.2s"
            }}>
            {c}
          </button>
        ))}
      </div>

      {news.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma notícia carregada no momento.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {filteredNews.map((item: NewsArticle) => (
            <a 
              key={item.id} 
              href={item.url} 
              target="_blank" 
              rel="noreferrer" 
              className="card" 
              style={{ 
                textDecoration: "none", 
                padding: "0", 
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
              }}
            >
              {item.imageUrl ? (
                <div style={{ height: "180px", overflow: "hidden", borderBottom: "1px solid var(--line)", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(to top, var(--bg-card), transparent)", zIndex: 1, opacity: 0.5 }}></div>
                  <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ height: "180px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "3rem", opacity: 0.1 }}>📰</span>
                </div>
              )}
              
              <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.65rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                  <span>{item.source}</span>
                  <span style={{ color: "var(--muted)" }}>{fmtDate(item.publishedAt)}</span>
                </div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.4, marginBottom: "1rem" }}>
                  {item.title}
                </h4>
                <div style={{ marginTop: "auto", fontSize: "0.75rem", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                  Ler matéria completa <span style={{ marginLeft: "0.25rem" }}>→</span>
                </div>
              </div>
            </a>
          ))}
          {filteredNews.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
              Nenhuma notícia encontrada para este filtro.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
