#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;

fn get_db_path() -> PathBuf {
    let app_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ai-directors-chair");
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("projects.db")
}

fn init_database(db_path: &PathBuf) -> Result<(), rusqlite::Error> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            genre TEXT DEFAULT 'drama',
            synopsis TEXT DEFAULT '',
            tone TEXT DEFAULT 'cinematic',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            photo_data TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS scenes (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            scene_number INTEGER NOT NULL,
            title TEXT DEFAULT '',
            description TEXT DEFAULT '',
            prompt TEXT DEFAULT '',
            camera_angle TEXT DEFAULT 'medium shot',
            lighting TEXT DEFAULT 'natural',
            duration INTEGER DEFAULT 5,
            dialog TEXT DEFAULT '',
            characters_json TEXT DEFAULT '[]',
            status TEXT DEFAULT 'pending',
            video_url TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS video_jobs (
            id TEXT PRIMARY KEY,
            scene_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            job_id TEXT NOT NULL,
            status TEXT DEFAULT 'queued',
            video_url TEXT DEFAULT '',
            cost REAL DEFAULT 0.0,
            started_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
        CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
        CREATE INDEX IF NOT EXISTS idx_scenes_order ON scenes(project_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_jobs_scene ON video_jobs(scene_id);
    ",
    )?;

    Ok(())
}

#[tauri::command]
fn get_app_data_dir() -> String {
    get_db_path()
        .parent()
        .unwrap_or(&PathBuf::from("."))
        .to_string_lossy()
        .to_string()
}

fn main() {
    let db_path = get_db_path();

    if let Err(e) = init_database(&db_path) {
        eprintln!("Failed to initialize database: {}", e);
    } else {
        println!("Database initialized at: {:?}", db_path);
    }

    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_app_data_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
