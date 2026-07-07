import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError, ApiError, serializeLead } from "@/lib/api";
import { followUpRescheduleSchema } from "@/lib/validation";
import { canEditLeadStatus } from "@/lib/domain";

type Params = { params: { id: string } };

// POST /api/leads/[id]/followup
// Reagenda o proximo follow-up de um lead. Usado pelo modal "Proxima acao"
// (aberto ao clicar em "Contatei" na tela de Follow-ups), quando o usuario
// escolhe "Agendar follow-up" e informa a nova data.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = followUpRescheduleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? "Dados invalidos");
    }
    const { nextFollowUp } = parsed.data;

    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Lead nao encontrado");

    // Mesma regra de permissao usada na edicao geral do lead (SDR so mexe ate qualificado).
    const perm = canEditLeadStatus(user.role, existing.status);
    if (!perm.ok) throw new ApiError(403, perm.reason!);

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id: params.id },
        data: { nextFollowUp, lastContact: new Date(), inactive: false },
      });
      await tx.interaction.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          type: "NOTA",
          content: `Contato realizado. Follow-up reagendado para ${nextFollowUp.toLocaleDateString("pt-BR")}.`,
        },
      });
      return lead;
    });

    return NextResponse.json(serializeLead(updated));
  } catch (err) {
    return handleError(err);
  }
}
