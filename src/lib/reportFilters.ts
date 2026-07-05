import { Prisma, LeadStatus, LeadSource } from "@prisma/client";

/**
 * Monta o filtro de leads a partir dos parametros de busca.
 * Compartilhado entre GET /api/leads e os relatorios (PDF/CSV) para os
 * dois lugares sempre respeitarem exatamente os mesmos filtros.
 */
export function buildLeadWhere(sp: URLSearchParams): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
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
  return where;
}
