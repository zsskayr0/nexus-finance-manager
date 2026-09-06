import type { DragEvent } from "react";

/**
 * Payload arrastado no Fluxo de Trabalho — três origens possíveis, a mesma
 * "moeda" pra qualquer célula de dia aceitar no drop:
 *  - "pending": um lembrete sem data (vira lançamento na data do drop, e o
 *    lembrete é apagado).
 *  - "recurring": uma ocorrência de recorrência ainda não lançada (vira
 *    lançamento na data do drop — não precisa ser a data de vencimento
 *    original, o usuário pode adiantar/atrasar arrastando).
 *  - "transaction": um lançamento já existente, sendo reagendado pra outra
 *    data.
 */
export type DragPayload =
  | { kind: "pending"; id: string }
  | { kind: "recurring"; recurringId: string; date: string; installmentNumber: number | null }
  | { kind: "transaction"; id: string };

const MIME = "application/x-nexus-drag";

export function setDragPayload(e: DragEvent, payload: DragPayload) {
  const raw = JSON.stringify(payload);
  e.dataTransfer.setData(MIME, raw);
  e.dataTransfer.setData("text/plain", raw); // fallback — alguns contextos só entregam o tipo genérico no drop
  e.dataTransfer.effectAllowed = "move";
}

export function readDragPayload(e: DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(MIME) || e.dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}
