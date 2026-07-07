import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { ApiError } from "@/lib/api";

/**
 * Busca o cliente existente pelo telefone normalizado, ou cria um novo se nao existir.
 * Regra de negocio: nunca duplicar cliente por telefone — leads sim, cliente nao.
 */
export async function findOrCreateCustomer(name: string, rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw new ApiError(400, `Telefone invalido: "${rawPhone}". Informe DDD + numero.`);
  }

  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) return existing;

  try {
    return await prisma.customer.create({ data: { name, phone } });
  } catch (err: any) {
    // Corrida: dois cadastros simultaneos com o mesmo telefone.
    if (err?.code === "P2002") {
      const raceWinner = await prisma.customer.findUnique({ where: { phone } });
      if (raceWinner) return raceWinner;
    }
    throw err;
  }
}