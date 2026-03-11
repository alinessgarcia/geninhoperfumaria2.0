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
