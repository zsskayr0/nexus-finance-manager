import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { buildBackupFileName, buildTransactionsCsv } from "@nexus/core";
import {
  getBackupSettings,
  listAttachmentsByTransaction,
  listCategories,
  listPayees,
  listTransactions,
  recordBackupResult,
  saveBackupDirectory,
} from "./db";

/**
 * Worker de backup do Desktop. O timing vem de um evento ("backup:heartbeat")
 * emitido pelo lado Rust a cada 5 min (e uma vez imediatamente ao abrir o
 * app — ver src-tauri/src/lib.rs); aqui só decidimos se já passaram as
 * `frequency_hours` configuradas e, se sim, exportamos.
 *
 * Limitação conhecida: isso só roda enquanto o app está aberto. Garantir a
 * exportação com o app completamente fechado exigiria registrar uma tarefa
 * no agendador do SO — fica como melhoria futura (ver Fase 2 da proposta).
 */

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

export async function pickBackupDirectory(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected || Array.isArray(selected)) return null;
  await saveBackupDirectory(selected);
  return selected;
}

export async function runBackupNow(): Promise<{ ok: boolean; filePath?: string; error?: string }> {
  const settings = await getBackupSettings();
  if (!settings?.exportDirectory) {
    return { ok: false, error: "Nenhuma pasta de backup selecionada." };
  }

  try {
    const [transactions, categories, payees] = await Promise.all([
      listTransactions(),
      listCategories(),
      listPayees(),
    ]);
    const attachmentsByTransactionId = await listAttachmentsByTransaction(
      transactions.map((t) => t.id),
    );

    const csv = buildTransactionsCsv({ transactions, categories, payees, attachmentsByTransactionId });
    const fileName = buildBackupFileName();
    const separator = settings.exportDirectory.includes("\\") ? "\\" : "/";
    const filePath = `${settings.exportDirectory}${separator}${fileName}`;

    await invoke("ensure_dir", { path: settings.exportDirectory });
    await invoke("write_text_file", { path: filePath, contents: csv });

    await recordBackupResult({
      status: "success",
      filePath,
      rowsExported: transactions.length,
      errorMessage: null,
    });
    return { ok: true, filePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordBackupResult({ status: "failed", filePath: null, rowsExported: null, errorMessage: message });
    return { ok: false, error: message };
  }
}

async function checkAndRunIfDue(): Promise<void> {
  const settings = await getBackupSettings();
  if (!settings || !settings.enabled || !settings.exportDirectory) return;

  const due = !settings.lastExportAt || hoursSince(settings.lastExportAt) >= settings.frequencyHours;
  if (due) await runBackupNow();
}

/** Chame uma vez, no boot do app (ver App.tsx). */
export async function initBackupWorker(): Promise<() => void> {
  // cobre o caso do primeiro heartbeat do Rust já ter disparado antes deste listener existir
  void checkAndRunIfDue();

  const unlisten = await listen("backup:heartbeat", () => {
    void checkAndRunIfDue();
  });
  return unlisten;
}
