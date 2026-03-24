use std::{
    fs,
    io::Write,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::Duration,
};

use tauri::{AppHandle, Manager, RunEvent};

fn log_line(message: &str) {
    let path = std::env::temp_dir().join("agent-windsurf-runtime.log");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(file, "{}", message);
    }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

struct BackendProcess(Mutex<Option<Child>>);

fn backend_is_running() -> bool {
    let addr: SocketAddr = "127.0.0.1:8060".parse().expect("valid backend address");
    TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok()
}

fn spawn_backend_process(program: &str, args: &[String], working_dir: &PathBuf) -> Option<Child> {
    log_line(&format!(
        "spawn_backend_process program={} working_dir={} args={:?}",
        program,
        working_dir.display(),
        args
    ));
    Command::new(program)
        .args(args)
        .current_dir(working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .ok()
}

fn find_file_recursive(root: &Path, file_name: &str) -> Option<PathBuf> {
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() && path.file_name().and_then(|name| name.to_str()) == Some(file_name) {
            return Some(path);
        }
        if path.is_dir() {
            if let Some(found) = find_file_recursive(&path, file_name) {
                return Some(found);
            }
        }
    }
    None
}

fn candidate_resource_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push(resource_dir);
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            roots.push(parent.to_path_buf());
            roots.push(parent.join("_up_"));
            roots.push(parent.join("..").join("_up_"));
        }
    }

    roots
}

fn find_portable_runtime_root(root: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if path.file_name().and_then(|name| name.to_str()) == Some("portable_runtime")
                && path.join("launcher.py").exists()
                && path.join("python.exe").exists()
            {
                return Some(path);
            }
            if let Some(found) = find_portable_runtime_root(&path) {
                return Some(found);
            }
        }
    }
    None
}

fn spawn_dev_backend() -> Option<Child> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let backend_dir = manifest_dir.join("..").join("..").join("backend");
    let launcher_path = backend_dir.join("launcher.py");
    let venv_python = backend_dir.join(".venv").join("Scripts").join("python.exe");

    if venv_python.exists() && launcher_path.exists() {
        return spawn_backend_process(
            venv_python.to_string_lossy().as_ref(),
            &[launcher_path.to_string_lossy().to_string()],
            &backend_dir,
        );
    }

    None
}

fn spawn_release_backend(app: &AppHandle) -> Option<Child> {
    for resource_dir in candidate_resource_roots(app) {
        log_line(&format!("checking resource_dir={}", resource_dir.display()));
        let Some(runtime_root) = find_portable_runtime_root(&resource_dir) else {
            continue;
        };
        let launcher_path = runtime_root.join("launcher.py");
        let working_dir = runtime_root;
        let bundled_python = Some(working_dir.join("python.exe"));
        log_line(&format!("launcher_path={}", launcher_path.display()));
        if let Some(path) = bundled_python.as_ref() {
            log_line(&format!("bundled_python={}", path.display()));
        } else {
            log_line("bundled_python not found");
        }

        let args = vec![launcher_path.to_string_lossy().to_string()];

        if let Some(python_path) = bundled_python {
            if let Some(child) = spawn_backend_process(python_path.to_string_lossy().as_ref(), &args, &working_dir) {
                return Some(child);
            }
        }
    }

    log_line("falling back to system python/py");
    let fallback_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let launcher = candidate_resource_roots(app)
        .into_iter()
        .find_map(|root| {
            find_portable_runtime_root(&root)
                .map(|runtime_root| runtime_root.join("launcher.py"))
                .or_else(|| find_file_recursive(&root, "launcher.py"))
        })?;
    let launcher_arg = launcher.to_string_lossy().to_string();
    spawn_backend_process("python", &[launcher_arg.clone()], &fallback_dir)
        .or_else(|| spawn_backend_process("py", &[String::from("-3"), launcher_arg], &fallback_dir))
}

fn shutdown_backend(app: &AppHandle) {
    if let Some(state) = app.try_state::<BackendProcess>() {
        if let Ok(mut process_guard) = state.0.lock() {
            if let Some(child) = process_guard.as_mut() {
                let _ = child.kill();
            }
            *process_guard = None;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            log_line("tauri setup starting");
            let child = if backend_is_running() {
                log_line("backend already running on 127.0.0.1:8060");
                None
            } else if cfg!(debug_assertions) {
                log_line("debug mode backend startup path");
                spawn_dev_backend()
            } else {
                log_line("release mode backend startup path");
                spawn_release_backend(&app.handle())
            };

            log_line(&format!("backend child created={}", child.is_some()));
            app.manage(BackendProcess(Mutex::new(child)));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
                shutdown_backend(app);
            }
        });
}
