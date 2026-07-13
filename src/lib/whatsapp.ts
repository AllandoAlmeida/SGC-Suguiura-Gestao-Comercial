import crypto from "crypto";

/**
 * Valida a assinatura enviada pela Meta no header X-Hub-Signature-256.
 * A Meta assina o corpo bruto (raw) da requisicao com HMAC-SHA256 usando o
 * App Secret do app cadastrado no Meta for Developers.
 *
 * IMPORTANTE: precisa ser calculado sobre o texto bruto da requisicao,
 * antes de qualquer JSON.parse — por isso a rota le o body como texto.
 */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.replace("sha256=", "");

  // Comparacao em tempo constante, pra evitar timing attack.
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Tipos minimos do payload da Cloud API — so o que usamos.
export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

/** Extrai as mensagens de texto de um payload de webhook, ja "achatadas". */
export function extractMessages(payload: WhatsAppWebhookPayload) {
  const result: Array<{ messageId: string; from: string; body: string; contactName: string | null }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;
      const contactName = value.contacts?.[0]?.profile?.name ?? null;
      for (const message of value.messages) {
        result.push({
          messageId: message.id,
          from: message.from,
          body: message.text?.body ?? "",
          contactName,
        });
      }
    }
  }

  return result;
}
