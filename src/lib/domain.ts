import { LeadStatus, Role } from "@prisma/client";
import { addDays } from "date-fns";

// ----- Configuracao de status / pipeline -----

export const STATUS_ORDER: LeadStatus[] = [
  "NOVO",
  "QUALIFICADO",
  "ORCAMENTO",
  "NEGOCIACAO",
  "FECHADO",
  "PERDIDO",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: "Novo",
  QUALIFICADO: "Qualificado",
  ORCAMENTO: "Orcamento",
  NEGOCIACAO: "Negociacao",
  FECHADO: "Fechado",
  PERDIDO: "Perdido",
};

// Cores por status (alinhadas ao tailwind.config + UX do projeto)
export const STATUS_COLOR: Record<LeadStatus, { bg: string; text: string; dot: string; border: string }> = {
  NOVO:        { bg: "bg-gray-100",    text: "text-gray-700",    dot: "bg-gray-400",    border: "border-gray-300" },
  QUALIFICADO: { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500",  border: "border-violet-300" },
  ORCAMENTO:   { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",   border: "border-amber-300" },
  NEGOCIACAO:  { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    border: "border-blue-300" },
  FECHADO:     { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500",   border: "border-green-300" },
  PERDIDO:     { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",     border: "border-red-300" },
};

export const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  LOJA: "Loja",
  EMAIL: "E-mail",
  PROSPECCAO: "Prospeccao",
  POS_VENDA: "Pós-venda",
};

export const ROLE_LABEL: Record<Role, string> = {
  SDR: "SDR (Pre-vendas)",
  CLOSER: "Closer (Vendas)",
  ADMIN: "Administrador",
};

// ----- Regras de negocio -----

/**
 * Regra: nao permitir orcamento sem diagnostico.
 * Para entrar em ORCAMENTO (ou adiante), o lead precisa ter passado por QUALIFICADO.
 * Ou seja, nao se pula de NOVO direto para ORCAMENTO/NEGOCIACAO/FECHADO.
 */
export function isValidStatusTransition(from: LeadStatus, to: LeadStatus): { ok: boolean; reason?: string } {
  if (from === to) return { ok: true };

  // PERDIDO pode ser atingido de qualquer etapa; e pode-se reabrir de PERDIDO.
  if (to === "PERDIDO") return { ok: true };

  // Nao permitir orcamento (ou adiante) sem ter sido qualificado.
  const stagesRequiringDiagnosis: LeadStatus[] = ["ORCAMENTO", "NEGOCIACAO", "FECHADO"];
  if (from === "NOVO" && stagesRequiringDiagnosis.includes(to)) {
    return {
      ok: false,
      reason: "Nao e permitido avancar sem diagnostico. Qualifique o lead antes de gerar orcamento.",
    };
  }

  return { ok: true };
}

/**
 * Permissoes por papel.
 * SDR: cria leads e edita ate "Qualificado". Nao fecha venda.
 * CLOSER: edita leads qualificados em diante, negocia e fecha.
 * ADMIN: tudo.
 */
export function canEditLeadStatus(role: Role, targetStatus: LeadStatus): { ok: boolean; reason?: string } {
  if (role === "ADMIN") return { ok: true };

  if (role === "SDR") {
    const allowed: LeadStatus[] = ["NOVO", "QUALIFICADO", "PERDIDO"];
    if (!allowed.includes(targetStatus)) {
      return { ok: false, reason: "SDR so pode movimentar leads ate 'Qualificado'. Fechamento e funcao do Closer." };
    }
    return { ok: true };
  }

  if (role === "CLOSER") {
    // Closer atua de qualificado em diante.
    const blocked: LeadStatus[] = ["NOVO"];
    if (blocked.includes(targetStatus)) {
      return { ok: false, reason: "Closer atua em leads qualificados em diante." };
    }
    return { ok: true };
  }

  return { ok: false, reason: "Papel sem permissao." };
}

/**
  * automaticamente D+3 (3 dias a partir de agora ou da data base informada).
 */
export function defaultFollowUp(base: Date = new Date()): Date {
  return addDays(base, 3);
}

/** Indica se o papel pode fechar venda (status FECHADO). */
export function canCloseSale(role: Role): boolean {
  return role === "CLOSER" || role === "ADMIN";
}

/** Numero de dias sem contato para considerar o lead inativo. */
export function inactiveThresholdDays(): number {
  const v = Number(process.env.LEAD_INACTIVE_DAYS ?? 7);
  return Number.isFinite(v) && v > 0 ? v : 7;
}
