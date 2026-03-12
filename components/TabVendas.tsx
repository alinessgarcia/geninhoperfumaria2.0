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
          <div className="card-title">Registrar Venda</div>
          <div className="card-subtitle">Baixa automática no estoque</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Produto *</label>
                <select value={form.productId} onChange={e => upd("productId", e.target.value)}>
                  <option value="">Selecione o produto…</option>
                  {products.map((p: Product) => (
                    <option key={p.id} value={p.id} disabled={p.stock === 0}>
                      {p.name}{p.brand ? ` (${p.brand})` : ""} · {p.ml}ml · {fmt(p.sellPrice)} · Estoque: {p.stock}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field span-2">
                <label>Cliente *</label>
                <select value={form.customerId} onChange={e => upd("customerId", e.target.value)}>
                  <option value="">Selecione o cliente…</option>
                  {customers.map((c: Customer) => (
                    <option key={c.id} value={c.id}>
                      {STATUS_ICON[c.status]} {c.name}{c.contact ? ` · ${c.contact}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input type="number" min={1} value={form.quantity} onChange={e => upd("quantity", e.target.value)} />
              </div>
              <div className="field">
                <label>Data da venda</label>
                <input type="date" value={form.soldAt} onChange={e => upd("soldAt", e.target.value)} />
              </div>
              <div className="field">
                <label>Forma de pagamento</label>
                <select value={form.paymentMethod} onChange={e => upd("paymentMethod", e.target.value)}>
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">⚡ Pix</option>
                  <option value="cartao_avista">💳 Cartão à vista</option>
                  <option value="cartao_parcelado">💳 Cartão parcelado</option>
                  <option value="a_prazo">📝 A prazo / Fiado</option>
                </select>
              </div>
              <div className="field">
                <label>Parcelas {!isParcelado && "(só cartão parcelado ou a prazo)"}</label>
                <select value={form.installments} onChange={e => upd("installments", e.target.value)} disabled={!isParcelado}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x{n > 1 && selectedProduct ? ` de ${fmt((selectedProduct.sellPrice * parseNum(form.quantity) - parseNum(form.discount)) / n)}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Desconto (R$)</label>
                <input type="number" min={0} step="0.01" value={form.discount} onChange={e => upd("discount", e.target.value)} />
              </div>
              <div className="field">
                <label>Sinal / Entrada (R$)</label>
                <input type="number" min={0} step="0.01" value={form.deposit} onChange={e => upd("deposit", e.target.value)} />
              </div>
              {form.paymentMethod === "a_prazo" && (
                <div className="field">
                  <label>Datas de Vencimento</label>
                  <input value={form.dueDates} onChange={e => upd("dueDates", e.target.value)} placeholder="Ex.: Todo dia 10" />
                </div>
              )}
              <div className="field span-2">
                <label>Observações</label>
                <input value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Anotações sobre a venda…" />
              </div>
            </div>
            {selectedProduct && (
              <div style={{ background: "var(--gold-ghost)", border: "1px solid var(--gold-border)", borderRadius: 10, padding: "0.7rem 0.9rem", marginTop: "0.75rem", fontSize: "0.88rem" }}>
                <strong>Total da venda: {fmt(total)}</strong>
                {isParcelado && parseNum(form.installments) > 1 && <span style={{ color: "var(--muted)" }}> · {form.installments}x de {fmt(total / parseNum(form.installments))}</span>}
                {parseNum(form.deposit) > 0 && <span style={{ color: "var(--muted)" }}> · Restante: {fmt(total - parseNum(form.deposit))}</span>}
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Registrar venda</button>
            </div>
            <FeedbackMsg fb={fb} />
          </form>
        </div>

        <div className="card">
          <div className="card-title">Histórico de Vendas</div>
          <div className="filter-bar">
            <input className="search-input" placeholder="Buscar por produto ou cliente…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="list" style={{ maxHeight: 540, overflowY: "auto" }}>
            {filteredSales.length === 0 && <div className="empty-state"><div className="empty-icon">🛍</div><p>Nenhuma venda encontrada</p></div>}
            {filteredSales.map((s: Sale) => {
              const p = productById[s.productId];
              const c = customerById[s.customerId];
              const total = s.unitSalePrice * s.quantity - s.discount;
              const profit = (s.unitSalePrice - s.unitCostPrice) * s.quantity - s.discount;
              return (
                <div key={s.id} className="list-item">
                  <div className="list-item-main">
                    <div className="list-item-title">{p ? `${p.name} · ${p.ml}ml` : "Produto removido"}</div>
                    <div className="list-item-sub">
                      {c?.name ?? "—"} · {fmtDate(s.soldAt)} · {PAY_LABELS[s.paymentMethod]}
                      {s.installments > 1 && ` ${s.installments}x`}
                      {s.deposit > 0 && ` · Sinal: ${fmt(s.deposit)}`}
                      {s.discount > 0 && ` · Desc.: ${fmt(s.discount)}`}
                      {s.dueDates && <span style={{ color: "var(--info)" }}> · Venc.: {s.dueDates}</span>}
                    </div>
                    {s.notes && <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.15rem" }}>📝 {s.notes}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                    <span className="badge badge-gold">{fmt(total)}</span>
                    <span style={{ fontSize: "0.72rem", color: profit >= 0 ? "var(--ok)" : "var(--danger)" }}>Lucro: {fmt(profit)}</span>
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
