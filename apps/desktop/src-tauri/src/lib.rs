// Nexus Desktop — processo Rust/Tauri.
//
// Responsabilidades deste lado nativo (o resto da lógica de negócio mora em
// TypeScript, em `packages/core`, e é reaproveitada pelo frontend em src/):
//   1. Abrir a conexão SQLite e aplicar as migrations — uma por versão, em
//      `src-tauri/migrations/`, na ordem em que a tabela `migrations()`
//      abaixo as lista.
//
//      IMPORTANTE: o plugin de SQL guarda um checksum de cada migration já
//      aplicada e recusa abrir o banco se o SQL de uma versão antiga mudar
//      ("migration N was previously applied but has been modified") — foi
//      exatamente isso que quebrou o app quando `pending_items` foi
//      adicionada direto em `packages/core/src/schema.sql` (que a migration 1
//      usava via `include_str!`, então editar aquele arquivo editou a
//      migration 1 por baixo dos panos). Por isso cada arquivo aqui em
//      `migrations/` é uma FOTOGRAFIA congelada: depois de qualquer um rodar
//      `tauri dev`/`tauri build` com uma versão nova, aquele arquivo não pode
//      mais mudar — uma mudança de schema sempre vira um migrations/000N_*.sql
//      NOVO. `packages/core/src/schema.sql` continua sendo a referência do
//      schema completo e atual (documentação + fonte pro Mobile), mas ela não
//      alimenta a migration 1 mais — mantenha os dois em sincronia na mão.
//   2. Expor dois comandos de arquivo sem passar pelo sistema de escopo do
//      plugin `fs` — o usuário escolhe uma pasta arbitrária no disco para o
//      backup (fora do sandbox do app), e comandos Rust próprios com
//      `std::fs` não sofrem a restrição de escopo que o plugin `fs` impõe a
//      chamadas vindas do JS.
//   3. Emitir um "heartbeat" periódico (e um imediato, ao abrir o app) para
//      o frontend decidir se já passaram as `frequency_hours` configuradas
//      e, se sim, rodar a exportação CSV (lógica em src/lib/backup.ts).

use std::fs;
use std::path::Path;
use tauri::Emitter;
use tauri_plugin_sql::{Migration, MigrationKind};

const HEARTBEAT_INTERVAL_SECS: u64 = 5 * 60; // checa a cada 5 min se o backup de 12h está atrasado

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "schema_inicial",
            sql: include_str!("../migrations/0001_schema_inicial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "pending_items",
            sql: include_str!("../migrations/0002_pending_items.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "recurring_links",
            sql: include_str!("../migrations/0003_recurring_links.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "accounts",
            sql: include_str!("../migrations/0004_accounts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "account_color",
            sql: include_str!("../migrations/0005_account_color.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "recurring_payment_method",
            sql: include_str!("../migrations/0006_recurring_payment_method.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "pix_automatico",
            sql: include_str!("../migrations/0007_pix_automatico.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Lê um arquivo de texto arbitrário (usado pelo import de CSV) — mesma
/// lógica de `write_text_file`: comando Rust próprio para não esbarrar no
/// escopo do plugin `fs`, já que o arquivo pode estar em qualquer pasta.
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:nexus.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            ensure_dir,
            write_text_file,
            read_text_file,
            path_exists
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // heartbeat imediato: cobre o caso do app ter ficado fechado
                // por mais de 12h e precisar exportar assim que reabrir.
                let _ = handle.emit("backup:heartbeat", ());

                let mut interval =
                    tokio::time::interval(std::time::Duration::from_secs(HEARTBEAT_INTERVAL_SECS));
                loop {
                    interval.tick().await;
                    let _ = handle.emit("backup:heartbeat", ());
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Nexus");
}
