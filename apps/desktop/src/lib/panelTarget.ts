import type { Transaction } from "@nexus/core";

/** O que o painel de lançamento (flutuante ou fixo) está mostrando. */
export type PanelTarget = { mode: "new" } | { mode: "edit"; tx: Transaction };
