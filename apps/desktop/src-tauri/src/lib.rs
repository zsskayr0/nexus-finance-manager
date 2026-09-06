// Nexus Desktop — processo Rust/Tauri.
//
// O app não guarda mais banco nenhum localmente — todo dado mora no
// servidor (apps/server, Docker, porta 7023), o frontend fala com ele por
// HTTP (ver src/lib/db.ts). As migrations SQLite e o plugin `tauri-plugin-sql`
// saíram daqui pra lá (apps/server/migrations/), seguindo a mesma disciplina
// de "migration congelada depois de aplicada".
//
// Responsabilidades deste lado nativo (o resto da lógica de negócio mora em
// TypeScript, em `packages/core`, e é reaproveitada pelo frontend em src/):
//   1. Expor dois comandos de arquivo sem passar pelo sistema de escopo do
//      plugin `fs` — o usuário escolhe uma pasta arbitrária no disco para o
//      backup (fora do sandbox do app), e comandos Rust próprios com
//      `std::fs` não sofrem a restrição de escopo que o plugin `fs` impõe a
//      chamadas vindas do JS.
//   2. Emitir um "heartbeat" periódico (e um imediato, ao abrir o app) para
//      o frontend decidir se já passaram as `frequency_hours` configuradas
//      e, se sim, rodar a exportação CSV (lógica em src/lib/backup.ts).

use std::fs;
use std::path::Path;
use tauri::Emitter;

const HEARTBEAT_INTERVAL_SECS: u64 = 5 * 60; // checa a cada 5 min se o backup de 12h está atrasado

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
