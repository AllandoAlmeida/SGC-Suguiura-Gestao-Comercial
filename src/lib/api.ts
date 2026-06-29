import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";

export type SessionUser = { id: string; role: Role; name?: string | null; email?: string | null };

/** Garante sessao valida em route handlers. Lanca resposta 401 se nao autenticado. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.user) {
    throw new ApiError(401, "Nao autenticado");
  }
  return session.user as SessionUser;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Converte erros conhecidos em respostas JSON padronizadas. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[API ERROR]", err);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}

/** Serializa lead convertendo Decimal/Date para tipos JSON-friendly. */
export function serializeLead<T extends { estimatedValue: unknown }>(lead: T) {
  return {
    ...lead,
    estimatedValue: Number(lead.estimatedValue),
  };
}
