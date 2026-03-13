"use client";

import { useMemo, useState } from "react";
import type { Product, Sale, Feedback } from "./types";
import { fmt, parseNum } from "./helpers";
import { FeedbackMsg } from "./FeedbackMsg";
import { supabase } from "../lib/supabaseClient";

type Props = {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  lowStock: Product[];
};

export function TabEstoque({ products, setProducts, setSales, lowStock }: Props) {
  const [fb, setFb] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = { name: "", category: "", ml: "100", stock: "0", stockMin: "5", costPrice: "0", sellPrice: "0" };
  const [form, setForm] = useState(emptyForm);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p: Product) =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, ml: String(p.ml), stock: String(p.stock), stockMin: String(p.stockMin), costPrice: String(p.costPrice), sellPrice: String(p.sellPrice) });
    setFb(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFb(null);
    if (!form.name.trim()) { setFb({ kind: "error", text: "Informe o nome do perfume." }); return; }
    const payload = {
      name: form.name.trim(), category: form.category.trim() || "Sem categoria",
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
        <div style={{ background: "rgba(180,83,9,0.05)", border: "1px solid var(--warn)", padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontSize: "1.25rem", color: "var(--warn)" }}>⚠</span>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            <strong style={{ color: "var(--warn)" }}>Atenção:</strong> {lowStock.length} produto{lowStock.length > 1 ? "s" : ""} com estoque crítico (≤ 5 un.).
          </p>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">{editingId ? "Editar Produto" : "Novo Item"}</h3>
          <p className="card-subtitle">Entre com os detalhes do perfume</p>
          <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Nome do perfume *</label>
                <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Ex.: Sauvage" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Categoria</label>
                <input value={form.category} onChange={e => upd("category", e.target.value)} placeholder="Ex.: Masculino" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Volume (ml)</label>
                <input type="number" min={1} value={form.ml} onChange={e => upd("ml", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Estoque Atual</label>
                <input type="number" min={0} value={form.stock} onChange={e => upd("stock", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Estoque Mínimo</label>
                <input type="number" min={0} value={form.stockMin} onChange={e => upd("stockMin", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Custo (R$)</label>
                <input type="number" min={0} step="0.01" value={form.costPrice} onChange={e => upd("costPrice", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Venda (R$)</label>
                <input type="number" min={0} step="0.01" value={form.sellPrice} onChange={e => upd("sellPrice", e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="primary" type="submit" style={{ flex: 1 }}>{editingId ? "Salvar Alterações" : "Cadastrar Produto"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setFb(null); }} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", padding: "0 1rem" }}>✕</button>}
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Inventário</h3>
          <p className="card-subtitle">Gerenciamento de estoque</p>
          <div style={{ margin: "1.25rem 0" }}>
            <input placeholder="Buscar por nome ou categoria…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }} />
          </div>
          <div className="list" style={{ maxHeight: 520, overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>Nenhum item encontrado</div>}
            {filtered.map((p: Product) => (
              <div key={p.id} className="list-item" style={{ borderLeft: p.stock <= p.stockMin ? "3px solid var(--warn)" : "none", background: p.stock <= p.stockMin ? "rgba(180,83,9,0.03)" : "transparent" }}>
                <div>
                  <div className="list-item-title" style={{ fontWeight: 700 }}>{p.name} <span style={{ opacity: 0.5, fontWeight: 400 }}>· {p.ml}ml</span></div>
                  <div className="list-item-sub">
                    {p.category} · Estoque: <strong style={{ color: p.stock <= p.stockMin ? "var(--warn)" : "var(--gold)" }}>{p.stock} un.</strong> · Venda: {fmt(p.sellPrice)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => handleEdit(p)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)", color: "var(--muted)", padding: "4px 8px", fontSize: "0.75rem" }}>EDIT</button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: "rgba(155,28,28,0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "4px 8px", fontSize: "0.75rem" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
