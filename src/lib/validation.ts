import { z } from "zod";

export const leadCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  phone: z.string().min(8, "Telefone obrigatorio"),
  source: z.enum(["WHATSAPP", "LOJA", "EMAIL", "PROSPECCAO", "POS_VENDA"]),
  product: z.string().min(1, "Produto obrigatorio"),
  estimatedValue: z.coerce.number().min(0, "Valor invalido"),
  status: z.enum(["NOVO", "QUALIFICADO", "ORCAMENTO", "NEGOCIACAO", "FECHADO", "PERDIDO"]).optional(),
  ownerId: z.string().min(1, "Responsavel obrigatorio"),
  // Follow-up obrigatorio (regra de negocio): bloqueia salvar sem follow-up.
  nextFollowUp: z.coerce.date({ required_error: "Proximo follow-up e obrigatorio" }),
  lastContact: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  // Mesmo no update, se vier nextFollowUp ele precisa ser uma data valida;
  // a obrigatoriedade de existir e garantida no banco (campo NOT NULL).
  nextFollowUp: z.coerce.date().optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["NOVO", "QUALIFICADO", "ORCAMENTO", "NEGOCIACAO", "FECHADO", "PERDIDO"]),
});

export const interactionCreateSchema = z.object({
  type: z.enum(["MENSAGEM", "LIGACAO", "NOTA"]),
  content: z.string().min(1, "Conteudo obrigatorio"),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
