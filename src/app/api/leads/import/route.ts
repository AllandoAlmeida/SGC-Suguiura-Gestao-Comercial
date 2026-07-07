import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError, ApiError } from "@/lib/api";
import { defaultFollowUp, SOURCE_LABEL } from "@/lib/domain";
import { parseCsvLine, splitCsvLines, parseBrDate, parseBrNumber } from "@/lib/csvParse";
import { findOrCreateCustomer } from "@/lib/customer";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

// Mapa reverso "WhatsApp" -> "WHATSAPP", a partir do mesmo SOURCE_LABEL usado no export.
const LABEL_TO_SOURCE: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE_LABEL).map(([key, label]) => [label.trim().toLowerCase(), key])
);

type ImportError = { row: number; reason: string };

// POST /api/leads/import  -> importa leads a partir do CSV no mesmo formato do "Exportar CSV".
// Regra combinada: status sempre entra como "Novo" e o responsavel e sempre quem importou
// (as colunas "Status" e "Atendente" do arquivo sao ignoradas de proposito).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const csv = typeof body?.csv === "string" ? body.csv : "";
    if (!csv.trim()) {
      throw new ApiError(400, "Arquivo CSV vazio ou invalido.");
    }

    const lines = splitCsvLines(csv);
    // Se a primeira linha parecer um cabecalho (comeca com "Nome"), pula ela.
    const firstCols = parseCsvLine(lines[0] ?? "");
    const hasHeader = firstCols[0]?.trim().toLowerCase() === "nome";
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) {
      throw new ApiError(400, "Nenhuma linha de dados encontrada no arquivo.");
    }
    if (dataLines.length > MAX_ROWS) {
      throw new ApiError(400, `Arquivo tem mais de ${MAX_ROWS} linhas. Divida em arquivos menores.`);
    }

    const errors: ImportError[] = [];
    let created = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const rowNumber = i + (hasHeader ? 2 : 1); // numero da linha real no arquivo, pra facilitar o usuario achar
      const cols = parseCsvLine(dataLines[i]);
      // Mesma ordem de colunas do export: Nome;Telefone;Origem;Produto;Valor estimado;
      // Status;Atendente;Data de entrada;Ultimo contato;Proximo follow-up;Observacoes
      const [name, phone, sourceLabel, product, valueStr, , , , lastContactStr, nextFollowUpStr, notes] = cols;
      
      const name_ = name?.trim();
      const phone_ = phone?.trim();
      const customer = await findOrCreateCustomer(name_, phone_);
      const product_ = product?.trim();
      const sourceKey = LABEL_TO_SOURCE[sourceLabel?.trim().toLowerCase() ?? ""];
      const estimatedValue = parseBrNumber(valueStr) ?? 0;
      const nextFollowUp = parseBrDate(nextFollowUpStr) ?? defaultFollowUp();
      const lastContact = parseBrDate(lastContactStr);

      if (!name_) { errors.push({ row: rowNumber, reason: "Nome em branco" }); continue; }
      if (!phone_) { errors.push({ row: rowNumber, reason: "Telefone em branco" }); continue; }
      if (!sourceKey) { errors.push({ row: rowNumber, reason: `Origem "${sourceLabel}" nao reconhecida` }); continue; }
      if (!product_) { errors.push({ row: rowNumber, reason: "Produto em branco" }); continue; }

      try {
        await prisma.$transaction(async (tx) => {
          const lead = await tx.lead.create({
            data: {
              name: name_,
              phone: customer.phone,
              customerId: customer.id,
              source: sourceKey as never,
              product: product_,
              estimatedValue: new Prisma.Decimal(estimatedValue),
              status: "NOVO",
              ownerId: user.id,
              nextFollowUp,
              lastContact: lastContact ?? null,
              notes: notes?.trim() || null,
            },
          });
          await tx.interaction.create({
            data: {
              leadId: lead.id,
              userId: user.id,
              type: "NOTA",
              content: "Lead importado via CSV.",
            },
          });
        });
        created++;
      } catch {
        errors.push({ row: rowNumber, reason: "Erro ao salvar no banco de dados" });
      }
    }

    return NextResponse.json({ created, errors });
  } catch (err) {
    return handleError(err);
  }
}