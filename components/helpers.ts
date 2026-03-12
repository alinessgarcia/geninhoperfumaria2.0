import type { CustomerStatus, PaymentMethod } from "./types";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
export const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);
export const parseNum = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const toDate = (s: string) => new Date(s + "T00:00:00");
export const startOfWeek = (d: Date) => { const s = new Date(d); const day = s.getDay(); s.setDate(s.getDate() - (day === 0 ? 6 : day - 1)); s.setHours(0,0,0,0); return s; };
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const startOfQuarter = (d: Date) => { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); };
export const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
export const fmtDate = (s: string | null) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); };

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  ativo: "Ativo", inadimplente: "Inadimplente", fiel: "Fiel", vip: "VIP"
};
export const STATUS_BADGE: Record<CustomerStatus, string> = {
  ativo: "badge-ok", inadimplente: "badge-danger", fiel: "badge-gold", vip: "badge-navy"
};
export const STATUS_ICON: Record<CustomerStatus, string> = {
  ativo: "✓", inadimplente: "⚠", fiel: "★", vip: "♦"
};
export const PAY_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro", pix: "Pix", cartao_avista: "Cartão à vista", cartao_parcelado: "Cartão parcelado", a_prazo: "A prazo / Fiado"
};

export const GOLD_PALETTE = ["#b8943f", "#d4a853", "#e8c470", "#f0deb0", "#3b6a8c", "#1e3a4f"];
