import { useEffect, useState } from "react";
import type { BackupSettings } from "@nexus/core";
import { getBackupSettings, listBackupLog, resetAllData, setBackupEnabled, type BackupLogEntryRow } from "../lib/db";
import { ensureDefaultAccount, ensureDefaultCategories } from "../lib/seed";
import { pickBackupDirectory, runBackupNow } from "../lib/backup";
import { downloadImportTemplate, importTransactionsFromCsv, type ImportSummary } from "../lib/csvImport";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconCheck, IconCloudDown, IconDownload, IconFolder, IconTrash, IconUpload, IconX } from "../components/icons";

export function BackupSettingsPage({ onDataChanged }: { onDataChanged: () => void }) {
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [log, setLog] = useState<BackupLogEntryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function load() {
    setLoading(true);
    const [s, l] = await Promise.all([getBackupSettings(), listBackupLog(8)]);
    setSettings(s);
    setLog(l);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handlePickFolder() {
    setBusy(true);
    await pickBackupDirectory();
    await load();
    setBusy(false);
  }

  async function handleExportNow() {
    setBusy(true);
    await runBackupNow();
    await load();
    setBusy(false);
  }

  async function handleToggleEnabled() {
    if (!settings) return;
    setBusy(true);
    await setBackupEnabled(!settings.enabled);
    await load();
    setBusy(false);
  }

  async function handleDownloadTemplate() {
    await downloadImportTemplate();
  }

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importTransactionsFromCsv();
      if (result) {
        setImportResult(result);
        if (result.imported > 0) onDataChanged();
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetAllData();
      await ensureDefaultCategories();
      await ensureDefaultAccount();
      onDataChanged();
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="max-w-2xl">
      <h2 className="page-title mb-1">Backup & CSV</h2>
      <p className="mb-6 text-[0.82rem] text-[var(--text-faint)]">
        Exporta todas as transações para um arquivo .csv automaticamente a cada 12 horas, enquanto o Nexus
        está aberto, na pasta que você escolher abaixo.
      </p>

      <div className="card mb-4 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[0.86rem] font-bold">Pasta de destino</h4>
          <button
            onClick={handleToggleEnabled}
            disabled={busy || !settings}
            className={"rounded-full px-3 py-1 text-[0.68rem] font-bold " + (settings?.enabled ? "solid" : "card text-[var(--text-faint)]")}
          >
            {settings?.enabled ? "Ativado" : "Desativado"}
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2.5">
          <div className="solid flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]">
            <IconFolder width={16} height={16} />
          </div>
          <span className="mono truncate text-[0.78rem] text-[var(--text-muted)]">
            {settings?.exportDirectory ?? "Nenhuma pasta selecionada"}
          </span>
        </div>

        <div className="flex gap-2.5">
          <button onClick={handlePickFolder} disabled={busy} className="card rounded-[11px] px-4 py-2.5 text-[0.8rem] font-semibold text-[var(--text-muted)] disabled:opacity-60">
            Escolher pasta…
          </button>
          <button
            onClick={handleExportNow}
            disabled={busy || !settings?.exportDirectory}
            className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] disabled:opacity-60"
          >
            <IconCloudDown width={14} height={14} />
            Exportar agora
          </button>
        </div>

        {settings?.lastExportAt && (
          <p className="mt-3.5 text-[0.72rem] text-[var(--text-faint)]">
            Última exportação: {new Date(settings.lastExportAt).toLocaleString("pt-BR")} —{" "}
            <span className={settings.lastExportStatus === "success" ? "text-[var(--text)]" : "text-[var(--danger)]"}>
              {settings.lastExportStatus === "success" ? "sucesso" : "falhou"}
            </span>
          </p>
        )}
      </div>

      <div className="card mb-4 rounded-2xl p-5">
        <h4 className="mb-1 text-[0.86rem] font-bold">Importar transações</h4>
        <p className="mb-3.5 text-[0.76rem] text-[var(--text-faint)]">
          Traga lançamentos de uma planilha existente. Baixe o modelo, preencha as linhas e importe de volta.
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="card flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-semibold text-[var(--text-muted)] transition-transform active:scale-[0.98]"
          >
            <IconDownload width={14} height={14} />
            Baixar modelo CSV
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <IconUpload width={14} height={14} />
            {importing ? "Importando…" : "Selecionar arquivo CSV"}
          </button>
        </div>

        {importResult && (
          <div className="mt-3.5 rounded-[11px] border border-[var(--border)] bg-[var(--bg)] p-3">
            <p className="text-[0.78rem] font-semibold">
              {importResult.fileName}: {importResult.imported} {importResult.imported === 1 ? "lançamento importado" : "lançamentos importados"}
              {importResult.skipped > 0 && `, ${importResult.skipped} ${importResult.skipped === 1 ? "linha ignorada" : "linhas ignoradas"}`}
            </p>
            {importResult.skippedDetails.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {importResult.skippedDetails.slice(0, 6).map((detail, i) => (
                  <li key={i} className="text-[0.7rem] text-[var(--text-faint)]">
                    {detail}
                  </li>
                ))}
                {importResult.skippedDetails.length > 6 && (
                  <li className="text-[0.7rem] text-[var(--text-faint)]">…e mais {importResult.skippedDetails.length - 6}.</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card rounded-2xl p-5">
        <h4 className="mb-3 text-[0.86rem] font-bold">Histórico de execuções</h4>
        {log.length === 0 ? (
          <p className="text-[0.78rem] text-[var(--text-faint)]">Nenhuma exportação registrada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2.5 border-b border-[var(--border)] pb-2 text-[0.76rem] last:border-b-0">
                {entry.status === "success" ? (
                  <IconCheck width={13} height={13} strokeWidth={2.4} className="shrink-0 text-[var(--text)]" />
                ) : (
                  <IconX width={13} height={13} strokeWidth={2.4} className="shrink-0 text-[var(--danger)]" />
                )}
                <span className="mono text-[var(--text-muted)]">{new Date(entry.ran_at).toLocaleString("pt-BR")}</span>
                <span className="flex-1 truncate text-[var(--text-faint)]">
                  {entry.status === "success" ? `${entry.rows_exported ?? 0} lançamentos exportados` : entry.error_message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-4 rounded-2xl border-[var(--danger)]/40 p-5">
        <h4 className="mb-1 text-[0.86rem] font-bold text-[var(--danger)]">Zona de perigo</h4>
        <p className="mb-3.5 text-[0.76rem] text-[var(--text-faint)]">
          Apaga todos os lançamentos, recorrências e pendências, e restaura as categorias padrão — não tem como desfazer.
        </p>
        <button
          onClick={() => setConfirmReset(true)}
          className="solid-danger flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold transition-transform active:scale-[0.98]"
        >
          <IconTrash width={14} height={14} />
          Resetar todos os dados
        </button>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Resetar todos os dados?"
          message="Isso apaga permanentemente todos os lançamentos, recorrências, pendências, contas e pagadores/recebedores — sem volta. As categorias padrão e a Carteira Física voltam do zero."
          confirmLabel="Resetar tudo"
          busy={resetting}
          onCancel={() => setConfirmReset(false)}
          onConfirm={handleReset}
        />
      )}
    </div>
  );
}
