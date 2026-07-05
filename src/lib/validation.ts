import { z } from "zod";

export const leadCreateSchema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  phone: z.string().min(8, "Telefone obrigatorio"),
  source: z.enum(["WHATSAPP", "LOJA", "EMAIL", "PROSPECCAO", "POS_VENDA"]),
  product: z.string().min(1, "Produto obrigatorio"),
  estimatedValue: z.coerce.number().min(0, "Valor invalido"),
  status: z.enum(["NOVO", "QUALIFICADO", "ORCAMENTO", "NEGOCIACAO", "FECHADO", "PERDIDO"]).optional(),
  ownerId: z.string().min(1, "Responsável obrigatório"),
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
  content: z.string().min(1, "Conteúdo obrigatório"),
});

// Registro de usuario (auto-cadastro). Papel nunca vem do client — ver rota de registro.
export const registerSchema = z
  .object({
    name: z.string().min(2, "Nome obrigatorio"),
    email: z.string().email("E-mail invalido"),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  });

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
