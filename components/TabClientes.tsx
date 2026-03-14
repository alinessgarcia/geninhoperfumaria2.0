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
      referred_by: form.referredBy.trim() || "", contact: form.contact.trim(),
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
          <h3 className="card-title">{editingId ? "Editar Perfil" : "Novo Cliente"}</h3>
          <p className="card-subtitle">Cadastro e gestão de clientes</p>
          <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Nome Completo *</label>
                <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Ex.: Maria Oliveira" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Status</label>
                <select value={form.status} onChange={e => upd("status", e.target.value)}>
                  <option value="ativo">Ativo</option>
                  <option value="inadimplente">Inadimplente</option>
                  <option value="fiel">Fiel</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Histórico</label>
                <select value={form.risk} onChange={e => upd("risk", e.target.value)}>
                  <option value="nunca_deu_problema">Sem histórico de problemas</option>
                  <option value="ja_deu_problema">Já teve problemas</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Origem</label>
                <select value={form.origin} onChange={e => upd("origin", e.target.value)}>
                  <option value="direto">Venda Direta</option>
                  <option value="indicado">Indicação</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Contato (WhatsApp)</label>
                <input value={form.contact} onChange={e => upd("contact", e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Endereço</label>
                <input value={form.address} onChange={e => upd("address", e.target.value)} placeholder="Rua, número, complemento" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Bairro</label>
                <input value={form.neighborhood} onChange={e => upd("neighborhood", e.target.value)} placeholder="Ex.: Centro" />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Cidade</label>
                <input value={form.city} onChange={e => upd("city", e.target.value)} placeholder="Ex.: São Paulo" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button className="primary" type="submit" style={{ flex: 1 }}>{editingId ? "Salvar Perfil" : "Cadastrar Cliente"}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setFb(null); }} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--muted)", padding: "0 1rem" }}>✕</button>}
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        {/* Novas Sessões: Top Clientes & Vencimentos */}
        <div style={{ display: "grid", gap: "1.5rem" }}>
          
          <div className="card">
            <h3 className="card-title">Top Clientes Frequentes</h3>
            <p className="card-subtitle">Ranking por volume total de compras</p>
            <div className="list" style={{ marginTop: "1rem" }}>
              {useMemo(() => {
                const totals: Record<string, number> = {};
                sales.forEach(s => {
                  totals[s.customerId] = (totals[s.customerId] || 0) + (s.unitSalePrice * s.quantity - s.discount);
                });
                const top = Object.entries(totals).sort((a,b) => b[1] - a[1]).slice(0, 4);
                
                if (top.length === 0) return <div className="empty-state"><p>Nenhuma venda registrada ainda.</p></div>;
                
                return top.map(([cId, total], i) => {
                  const c = customers.find(x => x.id === cId);
                  if (!c) return null;
                  return (
                    <div key={cId} className="list-item" style={{ cursor: "pointer" }} onClick={() => setSearch(c.name)}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: i < 3 ? "var(--gold)" : "var(--muted)", minWidth: "20px", textAlign: "center" }}>
                          {i + 1}º
                        </div>
                        <div>
                          <div className="list-item-title">{c.name}</div>
                          <div className="list-item-sub">{c.contact || c.city || "Sem contato/cidade"}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 700, color: "var(--emerald-light)" }}>
                        {fmt(total)}
                      </div>
                    </div>
                  );
                });
              }, [sales, customers, setSearch])}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Próximos Vencimentos</h3>
            <p className="card-subtitle">Vendas a prazo em aberto</p>
            <div className="list" style={{ marginTop: "1rem" }}>
              {useMemo(() => {
                const pendentes = sales
                  .filter(s => s.paymentMethod === "a_prazo" && s.dueDates)
                  .sort((a, b) => new Date(a.dueDates.split(',')[0]).getTime() - new Date(b.dueDates.split(',')[0]).getTime())
                  .slice(0, 4);

                if (pendentes.length === 0) return <div className="empty-state"><p>Nenhuma venda a prazo com vencimento pendente.</p></div>;

                return pendentes.map(s => {
                  const c = customers.find(x => x.id === s.customerId);
                  const p = productById[s.productId];
                  const total = (s.unitSalePrice * s.quantity) - s.discount;
                  const firstDue = s.dueDates.split(',')[0];
                  
                  // Check if overdue
                  const isOverdue = new Date(firstDue).getTime() < new Date().getTime();

                  return (
                    <div key={s.id} className="list-item" style={{ borderLeft: `3px solid ${isOverdue ? "var(--danger)" : "var(--warn)"}`, cursor: "pointer" }} onClick={() => setSearch(c?.name || "")}>
                      <div>
                        <div className="list-item-title" style={{ color: isOverdue ? "var(--danger)" : "var(--text)" }}>
                          {c?.name || "Cliente excluído"}
                        </div>
                        <div className="list-item-sub" style={{ marginTop: "0.25rem" }}>
                          {p?.name || "Produto"} · <strong style={{ color: "var(--text)" }}>{fmt(total)}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {isOverdue ? (
                          <div className="badge badge-danger">Vencido!</div>
                        ) : (
                          <div style={{ fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--warn)", fontWeight: 700 }}>Vence em:</span><br/>
                            <span style={{ color: "var(--muted)" }}>{fmtDate(firstDue)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              }, [sales, customers, productById, setSearch])}
            </div>
          </div>

        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h3 className="card-title">Base de Clientes</h3>
          <p className="card-subtitle">Gerenciamento da carteira</p>
          <div style={{ margin: "1.25rem 0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input placeholder="Buscar nome ou cidade…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", flex: 1 }} />
            <div style={{ display: "flex", border: "1px solid var(--line)", background: "var(--bg)" }}>
              {(["todos", "ativo", "inadimplente", "fiel", "vip"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{ 
                  background: filterStatus === s ? "var(--gold)" : "transparent",
                  color: filterStatus === s ? "var(--bg-sidebar)" : "var(--muted)",
                  border: "none", padding: "0.5rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", textTransform: "uppercase"
                }}>
                  {s === "todos" ? "ALL" : s.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="list" style={{ maxHeight: 520, overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>Nenhum cliente na lista</div>}
            {filtered.map((c: Customer) => (
              <div key={c.id} style={{ marginBottom: "0.25rem" }}>
                <div className="list-item" style={{ 
                  cursor: "pointer", 
                  background: expandedId === c.id ? "rgba(212,175,55,0.03)" : "transparent",
                  borderLeft: c.status === "inadimplente" ? "3px solid var(--warn)" : "none"
                }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <div>
                    <div className="list-item-title" style={{ fontWeight: 700 }}>
                      <span style={{ color: STATUS_BADGE[c.status].includes("warn") ? "var(--warn)" : "var(--gold)", fontSize: "0.7rem", marginRight: "0.5rem" }}>
                        {STATUS_ICON[c.status]}
                      </span>
                      {c.name}
                    </div>
                    <div className="list-item-sub">
                      {c.contact || "(sem contato)"} · {c.city || "S/ localização"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gold)" }}>{fmt(customerTotal(c.id))}</div>
                    <span style={{ fontSize: "0.6rem", opacity: 0.4 }}>{expandedId === c.id ? "▲" : "▼"}</span>
                  </div>
                </div>
                {expandedId === c.id && (
                  <div style={{ padding: "1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", borderTop: "none" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                      <div>
                        <strong>Dados de Contato:</strong>
                        <p>{c.contact || "—"}</p>
                        <p>{c.address || "—"}</p>
                        <p>{c.neighborhood && c.neighborhood + ", "}{c.city || "—"}</p>
                      </div>
                      <div>
                        <strong>Observações:</strong>
                        <p>{c.notes || "Nenhuma nota."}</p>
                        <p style={{ marginTop: "0.5rem", color: c.risk === "ja_deu_problema" ? "var(--warn)" : "var(--emerald-light)" }}>
                          Histórico: {c.risk === "ja_deu_problema" ? "Risco Identificado" : "Bom Pagador"}
                        </p>
                      </div>
                    </div>
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--line)" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => handleEdit(c)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)", color: "var(--muted)", padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700 }}>EDITAR PERFIL</button>
                        <button onClick={() => handleDelete(c.id)} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--danger)", padding: "4px 12px", fontSize: "0.7rem", fontWeight: 700 }}>EXCLUIR</button>
                      </div>
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
