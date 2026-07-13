import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { findOrCreateCustomer } from "@/lib/customer";
import { defaultFollowUp } from "@/lib/domain";
import { verifyWhatsAppSignature, extractMessages, WhatsAppWebhookPayload } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// GET /api/webhooks/whatsapp
// Handshake de verificacao exigido pela Meta ao configurar o webhook no
// painel do Meta for Developers. Confirma que o dono do endpoint concorda
// em receber os eventos, respondendo o "challenge" de volta.
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST /api/webhooks/whatsapp
// Recebe as notificacoes de mensagem da Meta. Regra de negocio:
// - Telefone novo (nenhum Customer com esse telefone) -> cria Customer + Lead novo.
// - Telefone ja conhecido, mas sem nenhum lead em aberto (todos Fechado/Perdido)
//   -> cria um Lead novo pra esse Customer (nova oportunidade).
// - Telefone ja conhecido e com lead em aberto -> so registra a mensagem como
//   Interaction no lead em aberto mais recente (nao duplica lead).
export async function POST(req: NextRequest) {
  // Le o corpo como texto puro ANTES de fazer parse — a assinatura da Meta
  // e calculada sobre o texto bruto, nao sobre o objeto ja interpretado.
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const ownerEmail = process.env.WHATSAPP_DEFAULT_OWNER_EMAIL;
  if (!ownerEmail) {
    console.error("[WHATSAPP WEBHOOK] WHATSAPP_DEFAULT_OWNER_EMAIL nao configurado.");
    // Responde 200 mesmo assim: a Meta reenvia (com backoff) se receber erro,
    // e um erro de configuracao nossa nao deve gerar reenvios infinitos.
    return NextResponse.json({ received: true, warning: "owner nao configurado" });
  }
  const defaultOwner = await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase().trim() } });
  if (!defaultOwner) {
    console.error(`[WHATSAPP WEBHOOK] Usuario padrao "${ownerEmail}" nao encontrado.`);
    return NextResponse.json({ received: true, warning: "owner padrao nao encontrado" });
  }

  const messages = extractMessages(payload);

  for (const msg of messages) {
    try {
      // Idempotencia: a Meta pode reenviar o mesmo webhook mais de uma vez.
      const already = await prisma.interaction.findUnique({ where: { externalId: msg.messageId } });
      if (already) continue;

      const phone = normalizePhone(msg.from);
      if (!phone) {
        console.warn(`[WHATSAPP WEBHOOK] Telefone invalido recebido: "${msg.from}" — mensagem ignorada.`);
        continue;
      }

      const customer = await findOrCreateCustomer(msg.contactName || "Contato WhatsApp", phone);

      const openLead = await prisma.lead.findFirst({
        where: { customerId: customer.id, status: { notIn: ["FECHADO", "PERDIDO"] } },
        orderBy: { updatedAt: "desc" },
      });

      if (openLead) {
        // Ja existe negociacao em aberto: so registra a mensagem, nao cria lead novo.
        await prisma.$transaction(async (tx) => {
          await tx.interaction.create({
            data: {
              leadId: openLead.id,
              userId: defaultOwner.id,
              type: "MENSAGEM",
              content: msg.body || "(mensagem sem texto)",
              externalId: msg.messageId,
            },
          });
          await tx.lead.update({
            where: { id: openLead.id },
            data: { lastContact: new Date(), inactive: false },
          });
        });
      } else {
        // Telefone novo, ou cliente conhecido sem nenhuma negociacao em aberto: cria lead novo.
        await prisma.$transaction(async (tx) => {
          const lead = await tx.lead.create({
            data: {
              name: customer.name,
              phone: customer.phone,
              source: "WHATSAPP",
              product: "A definir",
              estimatedValue: 0,
              status: "NOVO",
              ownerId: defaultOwner.id,
              customerId: customer.id,
              nextFollowUp: defaultFollowUp(),
              lastContact: new Date(),
            },
          });
          await tx.interaction.create({
            data: {
              leadId: lead.id,
              userId: defaultOwner.id,
              type: "MENSAGEM",
              content: msg.body || "(mensagem sem texto)",
              externalId: msg.messageId,
            },
          });
        });
      }
    } catch (err) {
      // Um erro numa mensagem nao deve derrubar o processamento das outras.
      console.error("[WHATSAPP WEBHOOK] Erro ao processar mensagem:", err);
    }
  }

  // A Meta espera 200 rapido; processamos tudo de forma sincrona acima porque
  // o volume esperado (leads novos) e baixo, mas se o volume crescer muito,
  // o ideal e so enfileirar aqui e processar depois.
  return NextResponse.json({ received: true });
}
