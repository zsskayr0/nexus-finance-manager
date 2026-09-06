import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Diretório de dados persistentes — dentro do container, é o volume montado
 * em `/data` (ver Dockerfile/docker-compose.yml). Fora do Docker (dev
 * local), cai numa pasta `data/` dentro do próprio pacote.
 */
export const DATA_DIR = process.env.NEXUS_DATA_DIR ?? join(__dirname, "..", "data");
export const DB_PATH = join(DATA_DIR, "nexus.db");
export const ATTACHMENTS_DIR = join(DATA_DIR, "attachments");
export const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

/**
 * Build estático do frontend (`apps/desktop`, mesmo código do cliente
 * Tauri) — servido direto pelo servidor, na pegada do Immich: abrir
 * `http://<servidor>:7023` no navegador já mostra o app, sem precisar
 * instalar nada. `null` quando a pasta não existe (ex.: rodando o servidor
 * sozinho em dev, sem ter buildado o frontend) — nesse caso o servidor
 * simplesmente não serve nada em `/`, só a API continua de pé.
 */
export const WEB_DIR = process.env.NEXUS_WEB_DIR ?? join(__dirname, "..", "web");

export const PORT = Number(process.env.PORT ?? 7023);
export const HOST = process.env.HOST ?? "0.0.0.0";

/**
 * Chave simples de API (header `x-api-key`) — não é um sistema de login
 * completo (o app é de usuário único), só uma barreira pra não deixar a API
 * totalmente aberta pra qualquer um que tenha acesso à rede. Sem essa
 * variável definida, o servidor sobe sem autenticação (útil pra testar
 * localmente) mas avisa alto no log — em produção sempre defina
 * `NEXUS_API_KEY`.
 */
export const API_KEY = process.env.NEXUS_API_KEY || null;

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(ATTACHMENTS_DIR, { recursive: true });
