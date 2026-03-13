"use client";

import { useMemo, useState } from "react";
import type { Product, Customer, Sale, PaymentMethod, Feedback } from "./types";
import { fmt, parseNum, fmtDate, PAY_LABELS, STATUS_ICON } from "./helpers";
import { FeedbackMsg } from "./FeedbackMsg";
import { supabase } from "../lib/supabaseClient";

type Props = {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  productById: Record<string, Product>;
  customerById: Record<string, Customer>;
};

export function TabVendas({ sales, setSales, products, setProducts, customers, productById, customerById }: Props) {
  const [fb, setFb] = useState<Feedback>(null);
  const [search, setSearch] = useState("");
  const emptyForm = {
    productId: "", customerId: "", quantity: "1",
    paymentMethod: "dinheiro" as PaymentMethod, installments: "1",
    deposit: "0", discount: "0",
    soldAt: new Date().toISOString().slice(0, 10), notes: "", dueDates: "",
  };
  const [form, setForm] = useState(emptyForm);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedProduct = productById[form.productId];
  const total = selectedProduct ? (selectedProduct.sellPrice * parseNum(form.quantity)) - parseNum(form.discount) : 0;
  const isParcelado = form.paymentMethod === "cartao_parcelado" || form.paymentMethod === "a_prazo";

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter((s: Sale) => {
      const p = productById[s.productId];
      const c = customerById[s.customerId];
      return !q || (p?.name ?? "").toLowerCase().includes(q) || (c?.name ?? "").toLowerCase().includes(q);
    });
  }, [sales, search, productById, customerById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFb(null);
    const qty = Math.max(1, parseNum(form.quantity));
    const installments = isParcelado ? Math.max(1, parseNum(form.installments)) : 1;
    const deposit = Math.max(0, parseNum(form.deposit));
    const discount = Math.max(0, parseNum(form.discount));

    if (!selectedProduct) { setFb({ kind: "error", text: "Selecione um produto." }); return; }
    if (!form.customerId) { setFb({ kind: "error", text: "Selecione um cliente." }); return; }
    if (selectedProduct.stock < qty) { setFb({ kind: "error", text: `Estoque insuficiente. Disponível: ${selectedProduct.stock}` }); return; }

    const payload = {
      product_id: selectedProduct.id, customer_id: form.customerId, quantity: qty,
      payment_method: form.paymentMethod, installments, deposit, discount,
      unit_sale_price: selectedProduct.sellPrice, unit_cost_price: selectedProduct.costPrice,
      sold_at: form.soldAt, notes: form.notes.trim(), due_dates: form.dueDates.trim(),
    };
    const { data, error } = await supabase.from("sales").insert(payload).select("*").single();
    if (error || !data) { setFb({ kind: "error", text: error?.message ?? "Erro ao registrar venda." }); return; }

    const newStock = selectedProduct.stock - qty;
    await supabase.from("products").update({ stock: newStock }).eq("id", selectedProduct.id);

    setSales((prev: Sale[]) => [{ id: data.id, productId: data.product_id, customerId: data.customer_id, quantity: qty, paymentMethod: data.payment_method as PaymentMethod, installments, deposit, discount, unitSalePrice: data.unit_sale_price, unitCostPrice: data.unit_cost_price, soldAt: data.sold_at, notes: data.notes ?? "", dueDates: data.due_dates ?? "" }, ...prev]);
    setProducts((prev: Product[]) => prev.map((p: Product) => p.id === selectedProduct.id ? { ...p, stock: newStock } : p));

    const customer = customerById[form.customerId];
    setFb({ kind: "ok", text: `Venda registrada para ${customer?.name ?? "cliente"}. Estoque atualizado.` });
    setForm(f => ({ ...f, quantity: "1", installments: "1", deposit: "0", discount: "0", notes: "", dueDates: "" }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Vendas</h2>
          <p className="page-subtitle">{sales.length} venda{sales.length !== 1 ? "s" : ""} registrada{sales.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Novo Registro de Venda</h3>
          <p className="card-subtitle">Lançamento com baixa automática no estoque</p>
          <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Selecione o Perfume *</label>
                <select value={form.productId} onChange={e => upd("productId", e.target.value)}>
                  <option value="">Escolha um item do estoque…</option>
                  {products.map((p: Product) => (
                    <option key={p.id} value={p.id} disabled={p.stock === 0}>
                      {p.name} · {p.ml}ml ({fmt(p.sellPrice)}) · Est: {p.stock}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Selecione o Cliente *</label>
                <select value={form.customerId} onChange={e => upd("customerId", e.target.value)}>
                  <option value="">Buscar cliente na carteira…</option>
                  {customers.map((c: Customer) => (
                    <option key={c.id} value={c.id}>
                      {STATUS_ICON[c.status]} {c.name} {c.contact && `(${c.contact})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Quantidade</label>
                <input type="number" min={1} value={form.quantity} onChange={e => upd("quantity", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Data</label>
                <input type="date" value={form.soldAt} onChange={e => upd("soldAt", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Forma de Pagto.</label>
                <select value={form.paymentMethod} onChange={e => upd("paymentMethod", e.target.value)}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="cartao_avista">Cartão (à vista)</option>
                  <option value="cartao_parcelado">Cartão (parcelado)</option>
                  <option value="a_prazo">A prazo / Fiado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Parcelas</label>
                <select value={form.installments} onChange={e => upd("installments", e.target.value)} disabled={!isParcelado}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Desconto (R$)</label>
                <input type="number" min={0} step="0.01" value={form.discount} onChange={e => upd("discount", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Sinal / Entrada</label>
                <input type="number" min={0} step="0.01" value={form.deposit} onChange={e => upd("deposit", e.target.value)} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Datas combinadas para pagamento</label>
                <input value={form.dueDates} onChange={e => upd("dueDates", e.target.value)} placeholder="Ex.: Todo dia 10 e 20..." />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>Observações Internas</label>
                <input value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Notas sobre a venda…" />
              </div>
            </div>

            {selectedProduct && (
              <div style={{ background: "rgba(212,175,55,0.05)", border: "1px solid var(--line)", padding: "1rem", marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase" }}>Total a Receber</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--gold)" }}>{fmt(total)}</span>
                </div>
                {isParcelado && parseNum(form.installments) > 1 && (
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "right", marginTop: "0.25rem" }}>
                    {form.installments}x de {fmt(total / parseNum(form.installments))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "1.5rem" }}>
              <button className="primary" type="submit" style={{ width: "100%" }}>FINALIZAR VENDA</button>
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Fluxo de Pedidos</h3>
          <p className="card-subtitle">Histórico recente de transações</p>
          <div style={{ margin: "1.25rem 0" }}>
            <input placeholder="Buscar produto ou cliente…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }} />
          </div>
          <div className="list" style={{ maxHeight: 540, overflowY: "auto" }}>
            {filteredSales.length === 0 && <div style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}>Sem registros encontrados</div>}
            {filteredSales.map((s: Sale) => {
              const p = productById[s.productId];
              const c = customerById[s.customerId];
              const total = s.unitSalePrice * s.quantity - s.discount;
              const profit = (s.unitSalePrice - s.unitCostPrice) * s.quantity - s.discount;
              return (
                <div key={s.id} className="list-item">
                  <div style={{ flex: 1 }}>
                    <div className="list-item-title" style={{ fontWeight: 700 }}>
                      {p ? p.name : <span style={{ color: "var(--danger)" }}>Removido</span>}
                    </div>
                    <div className="list-item-sub">
                      {c?.name || "Cliente Excluído"} · {fmtDate(s.soldAt)} · {PAY_LABELS[s.paymentMethod]} {s.installments > 1 && `${s.installments}x`}
                    </div>
                    {s.dueDates && <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginTop: "0.25rem", fontStyle: "italic" }}>📅 Venc: {s.dueDates}</div>}
                    {s.notes && <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.4rem", borderLeft: "2px solid var(--line)", paddingLeft: "0.5rem" }}>{s.notes}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "var(--gold)" }}>{fmt(total)}</div>
                    <div style={{ fontSize: "0.7rem", color: profit >= 0 ? "var(--emerald-light)" : "var(--warn)" }}>Lucro: {fmt(profit)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
