import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/users  -> lista de atendentes (para atribuicao de responsavel/filtros)
export async function GET() {
  try {
    await requireUser();
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    return handleError(err);
  }
}
