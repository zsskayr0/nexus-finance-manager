import { describe, expect, it } from "vitest";
import { buildImportTemplateCsv, isRowImportable, parseTransactionsCsv, rowToNewTransaction } from "./csv-import.js";

describe("parseTransactionsCsv", () => {
  it("lê um CSV bem formado (mesmas colunas do export)", () => {
    const csv = [
      "Data;Descrição;Tipo;Valor;Categoria;Pagador/Recebedor;Forma de pagamento;Observações",
      "04/09/2026;Mercado Extra;Despesa;234,50;Alimentação;Mercado Extra Ltda;pix;",
      "03/09/2026;Salário;Receita;8500,00;Renda;Empresa Vórtice;ted;pagamento mensal",
    ].join("\r\n");

    const rows = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: "expense",
      amountCents: 23450,
      occurredAt: "2026-09-04",
      description: "Mercado Extra",
      categoryName: "Alimentação",
      payeeName: "Mercado Extra Ltda",
      paymentMethod: "pix",
      errors: [],
    });
    expect(rows[1]).toMatchObject({
      type: "income",
      amountCents: 850000,
      occurredAt: "2026-09-03",
      notes: "pagamento mensal",
    });
    expect(rows.every(isRowImportable)).toBe(true);
  });

  it("aceita cabeçalhos em inglês e tipos alternativos (income/expense)", () => {
    const csv = "data;descricao;tipo;valor\n01/01/2026;Teste;income;10,00";
    const rows = parseTransactionsCsv(csv);
    expect(rows[0]!.type).toBe("income");
  });

  it("reporta erros por linha em vez de derrubar o import inteiro", () => {
    const csv = [
      "Data;Descrição;Tipo;Valor",
      "31/13/2026;Data quebrada;Despesa;10,00",
      "01/09/2026;Tipo quebrado;Xyz;10,00",
      "01/09/2026;Valor quebrado;Despesa;abc",
    ].join("\n");

    const rows = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => !isRowImportable(r))).toBe(true);
    expect(rows[0]!.errors[0]).toMatch(/Data inválida/);
    expect(rows[1]!.errors[0]).toMatch(/Tipo desconhecido/);
    expect(rows[2]!.errors[0]).toMatch(/Valor inválido/);
  });

  it("lida com campos entre aspas contendo o delimitador", () => {
    const csv = 'Data;Descrição;Tipo;Valor\n01/09/2026;"Mercado; Extra";Despesa;10,00';
    const rows = parseTransactionsCsv(csv);
    expect(rows[0]!.description).toBe("Mercado; Extra");
  });

  it("ignora linhas em branco", () => {
    const csv = "Data;Descrição;Tipo;Valor\n01/09/2026;A;Despesa;10,00\n\n02/09/2026;B;Receita;5,00\n";
    const rows = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(2);
  });
});

describe("rowToNewTransaction", () => {
  it("monta um NewTransaction a partir de uma linha válida", () => {
    const [row] = parseTransactionsCsv("Data;Descrição;Tipo;Valor\n04/09/2026;Mercado;Despesa;234,50");
    const tx = rowToNewTransaction(row!, "cat_alimentacao", "payee_1");
    expect(tx).toMatchObject({
      type: "expense",
      amountCents: 23450,
      occurredAt: "2026-09-04",
      description: "Mercado",
      categoryId: "cat_alimentacao",
      payeeId: "payee_1",
      source: "manual",
    });
  });
});

describe("buildImportTemplateCsv", () => {
  it("gera um modelo que o próprio parser consegue reimportar", () => {
    const template = buildImportTemplateCsv();
    const rows = parseTransactionsCsv(template);
    expect(rows).toHaveLength(1);
    expect(isRowImportable(rows[0]!)).toBe(true);
  });
});
