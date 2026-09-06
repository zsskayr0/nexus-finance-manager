/**
 * Endereço do servidor Nexus (Docker, porta 7023) + chave de API — o
 * cliente não guarda mais banco nenhum, então precisa saber pra onde
 * mandar toda leitura/escrita. Guardado em `localStorage` (por enquanto —
 * uma tela de configuração de verdade é uma melhoria futura); com valores
 * padrão pra funcionar de cara contra um servidor rodando em localhost.
 */

const URL_KEY = "nexus:server-url";
const API_KEY_KEY = "nexus:server-api-key";

export const DEFAULT_SERVER_URL = "http://localhost:7023";

export function getServerUrl(): string {
  return localStorage.getItem(URL_KEY) || DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string): void {
  localStorage.setItem(URL_KEY, url.replace(/\/+$/, ""));
}

export function getServerApiKey(): string | null {
  return localStorage.getItem(API_KEY_KEY) || null;
}

export function setServerApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_KEY, key);
  else localStorage.removeItem(API_KEY_KEY);
}
