import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError, ApiError } from "@/lib/api";
import { interactionCreateSchema } from "@/lib/validation";

type Params = { params: { id: string } };

// GET /api/leads/[id]/interactions
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const interactions = await prisma.interaction.findMany({
      where: { leadId: params.id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(interactions);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/leads/[id]/interactions  -> registra mensagem/ligacao/nota
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = interactionCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? "Dados invalidos");
    }

    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead) throw new ApiError(404, "Lead nao encontrado");

    const interaction = await prisma.$transaction(async (tx) => {
      const created = await tx.interaction.create({
        data: {
          leadId: params.id,
          userId: user.id,
          type: parsed.data.type,
          content: parsed.data.content,
        },
        include: { user: { select: { id: true, name: true } } },
      });
      // Toda mensagem/ligacao atualiza o ultimo contato.
      await tx.lead.update({
        where: { id: params.id },
        data: { lastContact: new Date(), inactive: false },
      });
      return created;
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
