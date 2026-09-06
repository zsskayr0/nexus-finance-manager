import { useState } from "react";
import { DEFAULT_SERVER_URL, getServerApiKey, getServerUrl, setServerApiKey, setServerUrl } from "../lib/serverConfig";
import { IconCheck, IconSettings } from "../components/icons";

/**
 * Configuração do servidor — o cliente não guarda mais banco nenhum, então
 * precisa saber pra onde mandar toda leitura/escrita (endereço Docker,
 * porta 7023 por padrão) e, se o servidor exigir, a chave de API. Guardado
 * em `localStorage` (ver lib/serverConfig.ts).
 */
export function SettingsPage() {
  const [url, setUrl] = useState(getServerUrl());
  const [apiKey, setApiKey] = useState(getServerApiKey() ?? "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers["x-api-key"] = apiKey;
      const res = await fetch(`${url.replace(/\/+$/, "")}/api/v1/categories`, { headers });
      if (res.ok) setTestResult({ ok: true, message: "Conectado com sucesso." });
      else if (res.status === 401) setTestResult({ ok: false, message: "Servidor respondeu, mas recusou a chave de API (401)." });
      else setTestResult({ ok: false, message: `Servidor respondeu com erro ${res.status}.` });
    } catch {
      setTestResult({ ok: false, message: "Não consegui alcançar esse endereço — confira se o servidor está rodando." });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setServerUrl(url.trim() || DEFAULT_SERVER_URL);
    setServerApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-lg">
      <h2 className="page-title mb-5">Configurações</h2>

      <div className="card rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[var(--panel-elevated)] text-[var(--text)]">
            <IconSettings width={16} height={16} />
          </div>
          <div>
            <h3 className="text-[0.9rem] font-bold">Servidor Nexus</h3>
            <p className="text-[0.72rem] text-[var(--text-faint)]">O app fala com um servidor (Docker, porta 7023) — nenhum dado fica só localmente.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <Field label="Endereço do servidor">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={DEFAULT_SERVER_URL} className="input mono" />
          </Field>

          <Field label="Chave de API (opcional)">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Deixe em branco se o servidor não exigir"
              className="input mono"
              type="password"
            />
          </Field>

          {testResult && (
            <p className={"text-[0.76rem] font-semibold " + (testResult.ok ? "text-[var(--text)]" : "text-[var(--danger)]")}>{testResult.message}</p>
          )}

          <div className="flex gap-2.5">
            <button
              onClick={handleTest}
              disabled={testing}
              className="card flex-1 rounded-[11px] py-2.5 text-[0.82rem] font-semibold text-[var(--text-muted)] transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {testing ? "Testando…" : "Testar conexão"}
            </button>
            <button
              onClick={handleSave}
              className="solid flex flex-1 items-center justify-center gap-1.5 rounded-[11px] py-2.5 text-[0.82rem] font-bold transition-transform active:scale-[0.98]"
            >
              {saved ? (
                <>
                  <IconCheck width={13} height={13} strokeWidth={2.6} /> Salvo
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>

          <p className="text-[0.68rem] text-[var(--text-faint)]">Depois de salvar, recarregue o app (feche e abra de novo) pra tudo usar o novo endereço.</p>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--panel-elevated);
          border: 1px solid var(--border);
          border-radius: 11px;
          padding: 9px 11px;
          font-size: 0.83rem;
          color: var(--text);
          font-family: inherit;
          transition: border-color .15s ease;
        }
        .input:focus { outline: 2px solid var(--border-strong); outline-offset: 1px; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{label}</span>
      {children}
    </label>
  );
}
