import { NextRequest, NextResponse } from "next/server";
import { LeadStatus, LeadSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findOrCreateCustomer } from "@/lib/customer";
import { requireUser, handleError, ApiError, serializeLead } from "@/lib/api";
import { leadCreateSchema } from "@/lib/validation";
import { canEditLeadStatus, isValidStatusTransition, inactiveThresholdDays, defaultFollowUp } from "@/lib/domain";
import { buildLeadWhere } from "@/lib/reportFilters";

// GET /api/leads?status=&ownerId=&source=&from=&to=&search=&overdue=
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const where = buildLeadWhere(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;

    //const where: Prisma.LeadWhereInput = {};
    const status = sp.get("status");
    const ownerId = sp.get("ownerId");
    const source = sp.get("source");
    const search = sp.get("search");
    const from = sp.get("from");
    const to = sp.get("to");
    const overdue = sp.get("overdue");

    if (status) where.status = status as LeadStatus;
    if (ownerId) where.ownerId = ownerId;
    if (source) where.source = source as LeadSource;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { product: { contains: search, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      where.entryDate = {};
      if (from) (where.entryDate as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        (where.entryDate as Prisma.DateTimeFilter).lte = end;
      }
    }
    if (overdue === "true") {
      where.nextFollowUp = { lt: new Date() };
      where.status = { notIn: ["FECHADO", "PERDIDO"] };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { owner: { select: { id: true, name: true, role: true } } },
      orderBy: { updatedAt: "desc" },
    });

    // Marca inatividade dinamicamente com base no ultimo contato.
    const threshold = inactiveThresholdDays();
    const limit = new Date();
    limit.setDate(limit.getDate() - threshold);

    const result = leads.map((l) => {
      const ref = l.lastContact ?? l.entryDate;
      const isInactive = ref < limit && l.status !== "FECHADO" && l.status !== "PERDIDO";
      return { ...serializeLead(l), inactive: isInactive };
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/leads  -> criar lead
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = leadCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? "Dados invalidos");
    }
    const data = parsed.data;
    const nextFollowUp = data.nextFollowUp ?? defaultFollowUp();
    const status = data.status ?? "NOVO";

    // Regra: papel deve poder definir o status escolhido.
    const perm = canEditLeadStatus(user.role, status);
    if (!perm.ok) throw new ApiError(403, perm.reason!);

    // Regra: nao permitir orcamento sem diagnostico tambem na criacao.
    // Toda criacao e tratada como uma transicao implicita a partir de "Novo",
    // entao nao e possivel criar um lead ja em Orcamento/Negociacao/Fechado
    // sem ele ter passado por Qualificado antes.
    const transition = isValidStatusTransition("NOVO", status);
    if (!transition.ok) throw new ApiError(422, transition.reason!);


    const customer = await findOrCreateCustomer(data.name, data.phone);    

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: customer.phone, // ja normalizado: +55(11) 999999999
        customerId: customer.id,
        source: data.source,
        product: data.product,
        estimatedValue: new Prisma.Decimal(data.estimatedValue),
        status,
        ownerId: data.ownerId,
        nextFollowUp,
        lastContact: data.lastContact ?? null,
        notes: data.notes ?? null,
      },
    });

    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        type: "NOTA",
        content: "Lead cadastrado no sistema.",
      },
    });

    return NextResponse.json(serializeLead(lead), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
