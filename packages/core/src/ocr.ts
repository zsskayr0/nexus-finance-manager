import type { OcrExtraction } from "./types.js";
import { toCents } from "./format.js";

/**
 * Estrutura o texto bruto devolvido pelo OCR on-device (Google ML Kit) em
 * campos utilizáveis (Data / Tipo / Valor / Pagador). É heurística, não
 * inteligência real — por isso todo campo extraído continua editável na
 * tela de confirmação antes de salvar (ver protótipo "Mobile · Comprovante").
 *
 * Quando a confiança fica baixa, o app pode oferecer reprocessar via Claude
 * Vision API (opt-in, com a chave do próprio usuário) em vez desta heurística.
 */

const MONTHS_PT: Record<string, string> = {
  janeiro: "01", fevereiro: "02", março: "03", marco: "03", abril: "04",
  maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
  outubro: "10", novembro: "11", dezembro: "12",
};

const INCOME_HINTS = /\b(recebid[oa]|receb[ie]mento|dep[oó]sito recebido|voc[eê] recebeu)\b/i;
const EXPENSE_HINTS = /\b(enviad[oa]|envi(?:ou|ei)|pagamento|pago a|voc[eê] pagou|compra aprovada|d[eé]bito)\b/i;

function normalize(text: string): string {
  return text.replace(/\r/g, "").trim();
}

/** "R$ 1.234,56" ou "1234,56" → 123456 (centavos). Retorna null se não achar. */
function extractAmountCents(text: string): number | null {
  const near = /valor(?:\s+total)?\s*[:\-]?\s*R?\$?\s*([\d.]{1,12},\d{2})/i.exec(text);
  const anywhere = /R\$\s*([\d.]{1,12},\d{2})/.exec(text);
  const raw = near?.[1] ?? anywhere?.[1];
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? toCents(value) : null;
}

/** Aceita "04/09/2026" ou "4 de setembro de 2026" → "2026-09-04". */
function extractDateISO(text: string): string | null {
  const slash = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(text);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m}-${d}`;
  }

  const extenso = /\b(\d{1,2})\s+de\s+([a-zçãõ]+)\s+de\s+(\d{4})\b/i.exec(text);
  if (extenso?.[1] && extenso[2] && extenso[3]) {
    const [, d, monthName, y] = extenso;
    const month = MONTHS_PT[monthName.toLowerCase()];
    if (month) return `${y}-${month}-${d.padStart(2, "0")}`;
  }

  return null;
}

function extractType(text: string): OcrExtraction["suggestedType"] {
  if (INCOME_HINTS.test(text)) return "income";
  if (EXPENSE_HINTS.test(text)) return "expense";
  return null;
}

/** Procura o nome do estabelecimento/pessoa após rótulos comuns de comprovante. */
function extractPayeeName(text: string): string | null {
  const labelled = /(?:para|recebedor|favorecido|nome)\s*[:\-]\s*([^\n]{2,60})/i.exec(text);
  if (labelled?.[1]) return labelled[1].trim();
  return null;
}

export function extractFromOcrText(rawText: string): OcrExtraction {
  const text = normalize(rawText);

  const suggestedAmountCents = extractAmountCents(text);
  const suggestedDate = extractDateISO(text);
  const suggestedType = extractType(text);
  const suggestedPayeeName = extractPayeeName(text);

  const fieldsFound = [suggestedAmountCents, suggestedDate, suggestedType, suggestedPayeeName].filter(
    (f) => f !== null,
  ).length;
  const confidence = Math.min(0.95, 0.15 + fieldsFound * 0.2);

  return {
    rawText: text,
    confidence,
    suggestedType,
    suggestedAmountCents,
    suggestedDate,
    suggestedPayeeName,
  };
}
