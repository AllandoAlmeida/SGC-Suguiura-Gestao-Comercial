import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError } from "@/lib/api";
import { buildLeadWhere } from "@/lib/reportFilters";
import { STATUS_LABEL, SOURCE_LABEL } from "@/lib/domain";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (/[",;\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET /api/leads/report/csv?status=&ownerId=&source=&from=&to=&search=&overdue=
// Exporta a mesma listagem/filtros da tela de Leads em CSV.
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const where = buildLeadWhere(req.nextUrl.searchParams);

    const leads = await prisma.lead.findMany({
      where,
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const headers = [
      "Nome",
      "Telefone",
      "Origem",
      "Produto",
      "Valor estimado",
      "Status",
      "Atendente",
      "Data de entrada",
      "Ultimo contato",
      "Proximo follow-up",
      "Observacoes",
    ];

    const rows = leads.map((l) => [
      l.name,
      l.phone,
      SOURCE_LABEL[l.source] ?? l.source,
      l.product,
      // Virgula decimal (padrao pt-BR) — combinado com ";" como separador de coluna,
      // para o Excel em pt-BR abrir corretamente sem confundir os dois.
      Number(l.estimatedValue).toFixed(2).replace(".", ","),
      STATUS_LABEL[l.status],
      l.owner.name,
      formatDate(l.entryDate),
      formatDate(l.lastContact),
      formatDate(l.nextFollowUp),
      l.notes ?? "",
    ]);

    const csvLines = [headers, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(";"));
    // BOM no inicio para o Excel reconhecer UTF-8 (acentos) corretamente.
    const csvContent = "\uFEFF" + csvLines.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
