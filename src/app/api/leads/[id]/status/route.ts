import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError, ApiError, serializeLead } from "@/lib/api";
import { statusUpdateSchema } from "@/lib/validation";
import { canEditLeadStatus, isValidStatusTransition } from "@/lib/domain";

type Params = { params: { id: string } };

// PATCH /api/leads/[id]/status  -> usado pelo drag-and-drop do Kanban
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Status invalido");

    const { status } = parsed.data;

    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Lead nao encontrado");
    if (existing.status === status) return NextResponse.json(serializeLead(existing));

    // Regra de permissao por papel (SDR nao fecha venda).
    const perm = canEditLeadStatus(user.role, status);
    if (!perm.ok) throw new ApiError(403, perm.reason!);

    // Regra de transicao (sem orcamento sem diagnostico).
    const transition = isValidStatusTransition(existing.status, status);
    if (!transition.ok) throw new ApiError(422, transition.reason!);

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id: params.id },
        data: { status, lastContact: new Date() },
      });
      await tx.interaction.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          type: "MUDANCA_STATUS",
          content: `Status alterado de ${existing.status} para ${status}.`,
          fromStatus: existing.status,
          toStatus: status,
        },
      });
      return lead;
    });

    return NextResponse.json(serializeLead(updated));
  } catch (err) {
    return handleError(err);
  }
}
