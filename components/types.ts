// ─── TYPES ────────────────────────────────────────────────────────────────────

export type Product = {
  id: string; name: string; brand: string; category: string;
  ml: number; stock: number; stockMin: number;
  costPrice: number; sellPrice: number;
};

export type CustomerStatus = "ativo" | "inadimplente" | "fiel" | "vip";

export type Customer = {
  id: string; name: string;
  status: CustomerStatus;
  risk: "nunca_deu_problema" | "ja_deu_problema";
  origin: "direto" | "indicado";
  referredBy: string;
  contact: string; address: string; city: string; neighborhood: string; notes: string;
};

export type PaymentMethod = "dinheiro" | "pix" | "cartao_avista" | "cartao_parcelado" | "a_prazo";

export type Sale = {
  id: string; productId: string; customerId: string;
  quantity: number; paymentMethod: PaymentMethod;
  installments: number; deposit: number; discount: number;
  unitSalePrice: number; unitCostPrice: number;
  soldAt: string; notes: string; dueDates: string;
};

export type NewsArticle = {
  id: string; title: string; url: string; source: string;
  imageUrl: string | null; publishedAt: string | null;
};

export type Tab = "dashboard" | "estoque" | "clientes" | "vendas" | "financeiro" | "noticias";
export type Feedback = { kind: "ok" | "error"; text: string } | null;

export type Summary = { revenue: number; profit: number; count: number };
