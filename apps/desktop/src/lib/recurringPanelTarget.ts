import type { RecurringTransaction, Transaction } from "@nexus/core";

/**
 * O que o painel de recorrência (flutuante ou fixo) está mostrando. O modo
 * "edit" carrega também o contexto da OCORRÊNCIA específica que foi clicada
 * (data, nº da parcela, lançamento já gerado se houver) — é o que permite o
 * modal de edição oferecer as mesmas ações de concluir/duplicar/excluir do
 * menu "..." da linha, não só editar os campos da regra.
 */
export type RecurringPanelTarget =
  | { mode: "new" }
  | {
      mode: "edit";
      recurring: RecurringTransaction;
      occurrenceDate: string;
      installmentNumber: number | null;
      occurrenceTransaction: Transaction | null;
    };
