import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError, ApiError, serializeLead } from "@/lib/api";
import { leadUpdateSchema } from "@/lib/validation";
import { canEditLeadStatus, isValidStatusTransition } from "@/lib/domain";

type Params = { params: { id: string } };

// GET /api/leads/[id]  -> detalhe + historico de interacoes
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, role: true } },
        interactions: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!lead) throw new ApiError(404, "Lead nao encontrado");
    return NextResponse.json(serializeLead(lead));
  } catch (err) {
    return handleError(err);
  }
}

// PATCH /api/leads/[id]  -> editar lead
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = leadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? "Dados invalidos");
    }
    const data = parsed.data;

    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Lead nao encontrado");

    // Se houver mudanca de status, aplica regras de transicao e permissao.
    if (data.status && data.status !== existing.status) {
      const perm = canEditLeadStatus(user.role, data.status);
      if (!perm.ok) throw new ApiError(403, perm.reason!);

      const transition = isValidStatusTransition(existing.status, data.status);
      if (!transition.ok) throw new ApiError(422, transition.reason!);
    } else {
      // Edicao geral: SDR so edita leads ate qualificado.
      const perm = canEditLeadStatus(user.role, existing.status);
      if (!perm.ok) throw new ApiError(403, perm.reason!);
    }

    const updateData: Prisma.LeadUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.product !== undefined) updateData.product = data.product;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = new Prisma.Decimal(data.estimatedValue);
    if (data.ownerId !== undefined) updateData.owner = { connect: { id: data.ownerId } };
    if (data.nextFollowUp !== undefined) updateData.nextFollowUp = data.nextFollowUp;
    if (data.lastContact !== undefined) updateData.lastContact = data.lastContact;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const statusChanged = data.status && data.status !== existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id: params.id },
        data: { ...updateData, ...(statusChanged ? { status: data.status } : {}) },
      });

      // Registra a mudanca de status no historico (regra: toda atualizacao de status deve ser registrada).
      if (statusChanged) {
        await tx.interaction.create({
          data: {
            leadId: lead.id,
            userId: user.id,
            type: "MUDANCA_STATUS",
            content: `Status alterado de ${existing.status} para ${data.status}.`,
            fromStatus: existing.status,
            toStatus: data.status,
          },
        });
      }
      return lead;
    });

    return NextResponse.json(serializeLead(updated));
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/leads/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (user.role === "SDR") {
      throw new ApiError(403, "SDR nao pode excluir leads.");
    }
    const existing = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError(404, "Lead nao encontrado");

    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
