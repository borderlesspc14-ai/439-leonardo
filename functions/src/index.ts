import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();

type OrderStatus = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";

function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDENTE": return "Pendente";
    case "EM_ANALISE": return "Em análise";
    case "APROVADO": return "Aprovado";
    case "REJEITADO": return "Rejeitado";
    default: return status;
  }
}

function buildEmailHtml(
  clientEmail: string,
  newStatus: string,
  statusLabel: string,
  orderId: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atualização do seu pedido</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="margin-top: 0; color: #111;">Atualização do seu pedido</h2>
  <p>Olá,</p>
  <p>O status do seu pedido foi atualizado:</p>
  <p style="font-size: 1.1em;"><strong>Novo status: ${statusLabel}</strong></p>
  <p>Mantemos você informado sobre as etapas do seu pedido. Em caso de dúvidas, entre em contato.</p>
  <p style="margin-top: 32px; font-size: 0.9em; color: #666;">
    Referência do pedido: ${orderId}
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.85em; color: #888;">Este é um e-mail automático. Por favor, não responda diretamente.</p>
</body>
</html>
  `.trim();
}

/**
 * Quando um documento em "orders" é atualizado, verifica se o campo "status" mudou.
 * Se mudou, cria um documento na coleção "mail" para a extensão Trigger Email
 * enviar um e-mail ao cliente (ownerEmail ou primeira coluna).
 *
 * Pré-requisito: instalar a extensão "Trigger Email" (firestore-send-email)
 * e configurá-la para monitorar a coleção "mail".
 */
export const onOrderStatusChange = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot?.before.exists || !snapshot?.after.exists) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    const prevStatus = before?.status as string | undefined;
    const newStatus = after?.status as string | undefined;

    if (prevStatus === newStatus || !newStatus) return;

    const email =
      (after?.ownerEmail as string) ||
      (Array.isArray(after?.columns) && after.columns[0]) ||
      "";
    const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!trimmed) return;

    const orderId = event.params.orderId;
    const statusLabel = getStatusLabel(newStatus as OrderStatus);
    const html = buildEmailHtml(trimmed, newStatus, statusLabel, orderId);

    const db = getFirestore();
    await db.collection("mail").add({
      to: trimmed,
      message: {
        subject: `Atualização do seu pedido – Status: ${statusLabel}`,
        html,
      },
    });
  }
);
