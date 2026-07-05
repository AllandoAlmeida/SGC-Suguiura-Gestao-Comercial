import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { handleError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// POST /api/auth/register  -> cria uma nova conta (auto-cadastro)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? "Dados invalidos");
    }
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      // Mensagem generica: nao confirma nem nega qual e-mail existe alem do necessario,
      // mas aqui o formulario de cadastro precisa avisar o usuario mesmo assim.
      throw new ApiError(409, "Ja existe uma conta cadastrada com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        // IMPORTANTE: o papel nunca deve vir do corpo da requisicao.
        // Todo auto-cadastro entra como SDR; promover a Closer/Admin e acao
        // administrativa feita depois (via Prisma Studio ou painel futuro).
        role: "SDR",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
