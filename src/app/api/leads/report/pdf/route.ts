import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError } from "@/lib/api";
import { buildLeadWhere } from "@/lib/reportFilters";
import { STATUS_LABEL } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// GET /api/leads/report/pdf?status=&ownerId=&source=&from=&to=&search=&overdue=
// Gera um PDF com a mesma listagem/filtros da tela de Leads.
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const where = buildLeadWhere(req.nextUrl.searchParams);

    const leads = await prisma.lead.findMany({
      where,
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    const finished = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const totalValue = leads.reduce((acc, l) => acc + Number(l.estimatedValue), 0);

    doc.fontSize(18).font("Helvetica-Bold").fillColor("#111").text("SGC — Relatorio de leads");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666")
      .text(
        `Gerado em ${new Date().toLocaleString("pt-BR")}  ·  ${leads.length} lead(s)  ·  total ${formatCurrency(totalValue)}`
      );
    doc.moveDown(1);

    // Colunas (largura em pt, soma = pageWidth)
    const cols = [
      { key: "name", label: "Cliente", width: pageWidth * 0.22 },
      { key: "product", label: "Produto", width: pageWidth * 0.18 },
      { key: "status", label: "Status", width: pageWidth * 0.13 },
      { key: "owner", label: "Atendente", width: pageWidth * 0.17 },
      { key: "value", label: "Valor", width: pageWidth * 0.15 },
      { key: "followUp", label: "Follow-up", width: pageWidth * 0.15 },
    ] as const;

    const left = doc.page.margins.left;
    const rowHeight = 22;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;

    function drawHeaderRow(y: number) {
      let x = left;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
      for (const col of cols) {
        doc.text(col.label, x, y, { width: col.width - 6 });
        x += col.width;
      }
      doc
        .moveTo(left, y + 16)
        .lineTo(left + pageWidth, y + 16)
        .strokeColor("#ccc")
        .lineWidth(0.5)
        .stroke();
    }

    let y = doc.y;
    drawHeaderRow(y);
    y += rowHeight;
    doc.font("Helvetica").fontSize(9).fillColor("#222");

    const values: Record<string, string> = {};
    for (const lead of leads) {
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow(y);
        y += rowHeight;
        doc.font("Helvetica").fontSize(9).fillColor("#222");
      }

      values.name = lead.name;
      values.product = lead.product;
      values.status = STATUS_LABEL[lead.status];
      values.owner = lead.owner.name;
      values.value = formatCurrency(Number(lead.estimatedValue));
      values.followUp = formatDate(lead.nextFollowUp);

      let x = left;
      for (const col of cols) {
        doc.text(values[col.key] ?? "-", x, y, { width: col.width - 6, ellipsis: true, lineBreak: false });
        x += col.width;
      }
      y += rowHeight;
    }

    if (leads.length === 0) {
      doc.text("Nenhum lead encontrado para os filtros selecionados.", left, y);
    }

    doc.end();
    const pdfBuffer = await finished;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-leads-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
