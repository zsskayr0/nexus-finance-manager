import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { buildImportTemplateCsv, isRowImportable, parseTransactionsCsv, rowToNewTransaction } from "@nexus/core";
import { findOrCreatePayee, insertTransaction, listCategories } from "./db";

/** Salva o modelo de CSV onde o usuário escolher. Retorna o caminho, ou null se cancelado. */
export async function downloadImportTemplate(): Promise<string | null> {
  const path = await save({
    defaultPath: "nexus_modelo_import.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });
  if (!path) return null;
  await invoke("write_text_file", { path, contents: buildImportTemplateCsv() });
  return path;
}

export interface ImportSummary {
  fileName: string;
  imported: number;
  skipped: number;
  skippedDetails: string[];
}

/** Abre o seletor de arquivo, importa as linhas válidas e reporta o que foi ignorado (e por quê). */
export async function importTransactionsFromCsv(): Promise<ImportSummary | null> {
  const selected = await open({ multiple: false, filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (!selected || Array.isArray(selected)) return null;

  const contents = await invoke<string>("read_text_file", { path: selected });
  const rows = parseTransactionsCsv(contents);

  const categories = await listCategories();
  const categoryIdByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  let imported = 0;
  const skippedDetails: string[] = [];

  for (const row of rows) {
    if (!isRowImportable(row)) {
      skippedDetails.push(`Linha ${row.lineNumber}: ${row.errors.join("; ")}`);
      continue;
    }
    try {
      const categoryId = row.categoryName ? (categoryIdByName.get(row.categoryName.toLowerCase()) ?? null) : null;
      const payeeId = row.payeeName ? await findOrCreatePayee(row.payeeName) : null;
      await insertTransaction(rowToNewTransaction(row, categoryId, payeeId));
      imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      skippedDetails.push(`Linha ${row.lineNumber}: falha ao salvar (${message})`);
    }
  }

  const fileName = selected.split(/[\\/]/).pop() ?? selected;
  return { fileName, imported, skipped: skippedDetails.length, skippedDetails };
}
