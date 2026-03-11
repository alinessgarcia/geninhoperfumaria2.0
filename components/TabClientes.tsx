"use client";

import { useMemo, useState } from "react";
import type { Product, Customer, Sale, CustomerStatus, Feedback } from "./types";
import { fmt, fmtDate, STATUS_LABELS, STATUS_BADGE, STATUS_ICON } from "./helpers";
import { FeedbackMsg } from "./FeedbackMsg";
import { supabase } from "../lib/supabaseClient";

type Props = {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  productById: Record<string, Product>;
};

export function TabClientes({ customers, setCustomers, sales, productById }: Props) {
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
