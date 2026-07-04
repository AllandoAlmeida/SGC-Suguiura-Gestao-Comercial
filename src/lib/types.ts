// Tipos compartilhados no client (espelham o retorno serializado da API)

export type Role = "SDR" | "CLOSER" | "ADMIN";
export type LeadSource = "WHATSAPP" | "LOJA" | "EMAIL" | "PROSPECCAO" | "POS_VENDA";
export type LeadStatus = "NOVO" | "QUALIFICADO" | "ORCAMENTO" | "NEGOCIACAO" | "FECHADO" | "PERDIDO";
export type InteractionType = "MENSAGEM" | "LIGACAO" | "NOTA" | "MUDANCA_STATUS";

export interface UserLite {
  id: string;
  name: string;
  role: Role;
  email?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  product: string;
  estimatedValue: number;
  status: LeadStatus;
  ownerId: string;
  owner?: UserLite;
  entryDate: string;
  lastContact: string | null;
  nextFollowUp: string;
  notes: string | null;
  inactive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  leadId: string;
  userId: string;
  user?: { id: string; name: string };
  type: InteractionType;
  content: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  createdAt: string;
}

export interface LeadWithInteractions extends Lead {
  interactions: Interaction[];
}

export interface DashboardData {
  totalLeads: number;
  inNegotiation: number;
  closedCount: number;
  closedValue: number;
  pipelineValue: number;
  conversionRate: number;
  inactiveCount: number;
  overdueCount: number;
  distribution: { status: LeadStatus; count: number; value: number }[];
  perUser: { id: string; name: string; role: Role; total: number; closed: number; closedValue: number }[];
  thresholdDays: number;
}
