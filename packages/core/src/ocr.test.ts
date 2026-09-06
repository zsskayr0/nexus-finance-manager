import { describe, expect, it } from "vitest";
import { extractFromOcrText } from "./ocr.js";

describe("extractFromOcrText", () => {
  it("extrai valor, data e tipo de um comprovante Pix enviado", () => {
    const text = [
      "COMPROVANTE DE TRANSFERÊNCIA",
      "Você enviou",
      "Valor: R$ 234,50",
      "Data: 04/09/2026",
      "Para: Mercado Extra Ltda",
    ].join("\n");

    const result = extractFromOcrText(text);
    expect(result.suggestedAmountCents).toBe(23450);
    expect(result.suggestedDate).toBe("2026-09-04");
    expect(result.suggestedType).toBe("expense");
    expect(result.suggestedPayeeName).toBe("Mercado Extra Ltda");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("reconhece um comprovante recebido como receita", () => {
    const text = "Pix recebido\nValor R$ 1.200,00\nData: 28/08/2026";
    const result = extractFromOcrText(text);
    expect(result.suggestedType).toBe("income");
    expect(result.suggestedAmountCents).toBe(120000);
  });

  it("aceita data por extenso em português", () => {
    const text = "Pago em 4 de setembro de 2026\nValor: R$ 39,90";
    const result = extractFromOcrText(text);
    expect(result.suggestedDate).toBe("2026-09-04");
  });

  it("retorna confiança baixa e campos nulos quando o texto não tem nada reconhecível", () => {
    const result = extractFromOcrText("texto sem nenhum campo reconhecível");
    expect(result.suggestedAmountCents).toBeNull();
    expect(result.suggestedDate).toBeNull();
    expect(result.confidence).toBeLessThan(0.3);
  });
});
