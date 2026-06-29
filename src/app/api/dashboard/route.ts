import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError } from "@/lib/api";
import { inactiveThresholdDays } from "@/lib/domain";

export const dynamic = "force-dynamic";

// GET /api/dashboard  -> metricas e dados para graficos
export async function GET() {
  try {
    await requireUser();

    const [byStatus, totalLeads, closedAgg, pipelineAgg, users, leads] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], _count: { _all: true }, _sum: { estimatedValue: true } }),
      prisma.lead.count(),
      prisma.lead.aggregate({ where: { status: "FECHADO" }, _sum: { estimatedValue: true }, _count: { _all: true } }),
      prisma.lead.aggregate({
        where: { status: { in: ["NOVO", "QUALIFICADO", "ORCAMENTO", "NEGOCIACAO"] } },
        _sum: { estimatedValue: true },
      }),
      prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true } }),
      prisma.lead.findMany({ select: { ownerId: true, status: true, estimatedValue: true, lastContact: true, entryDate: true } }),
    ]);

    const statusMap: Record<string, { count: number; value: number }> = {};
    for (const s of byStatus) {
      statusMap[s.status] = { count: s._count._all, value: Number(s._sum.estimatedValue ?? 0) };
    }

    const inNegotiation = statusMap["NEGOCIACAO"]?.count ?? 0;
    const closedCount = closedAgg._count._all;
    const closedValue = Number(closedAgg._sum.estimatedValue ?? 0);
    const pipelineValue = Number(pipelineAgg._sum.estimatedValue ?? 0);

    // Taxa de conversao = fechados / (fechados + perdidos) -> oportunidades decididas.
    const lostCount = statusMap["PERDIDO"]?.count ?? 0;
    const decided = closedCount + lostCount;
    const conversionRate = decided > 0 ? (closedCount / decided) * 100 : 0;

    // Desempenho por atendente.
    const perUser = users.map((u) => {
      const own = leads.filter((l) => l.ownerId === u.id);
      const closed = own.filter((l) => l.status === "FECHADO");
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        total: own.length,
        closed: closed.length,
        closedValue: closed.reduce((acc, l) => acc + Number(l.estimatedValue), 0),
      };
    });

    // Leads inativos (sem contato ha X dias).
    const threshold = inactiveThresholdDays();
    const limit = new Date();
    limit.setDate(limit.getDate() - threshold);
    const inactiveCount = leads.filter((l) => {
      const ref = l.lastContact ?? l.entryDate;
      return ref < limit && l.status !== "FECHADO" && l.status !== "PERDIDO";
    }).length;

    // Follow-ups atrasados.
    const overdueCount = await prisma.lead.count({
      where: { nextFollowUp: { lt: new Date() }, status: { notIn: ["FECHADO", "PERDIDO"] } },
    });

    const statusOrder = ["NOVO", "QUALIFICADO", "ORCAMENTO", "NEGOCIACAO", "FECHADO", "PERDIDO"];
    const distribution = statusOrder.map((status) => ({
      status,
      count: statusMap[status]?.count ?? 0,
      value: statusMap[status]?.value ?? 0,
    }));

    return NextResponse.json({
      totalLeads,
      inNegotiation,
      closedCount,
      closedValue,
      pipelineValue,
      conversionRate,
      inactiveCount,
      overdueCount,
      distribution,
      perUser,
      thresholdDays: threshold,
    });
  } catch (err) {
    return handleError(err);
  }
}
