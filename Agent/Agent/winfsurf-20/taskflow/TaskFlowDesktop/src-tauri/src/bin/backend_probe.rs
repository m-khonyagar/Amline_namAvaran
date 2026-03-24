use std::{
    fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    thread,
    time::{Duration, Instant},
};

fn candidate_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
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

fn port_healthy() -> bool {
    let addr: SocketAddr = "127.0.0.1:8060".parse().expect("valid address");
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(500)) else {
        return false;
    };
    let request = b"GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    if stream.write_all(request).is_err() {
        return false;
    }
    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return false;
    }
    response.contains("\"status\":\"ok\"") || response.contains("\"status\": \"ok\"")
}

fn spawn_bundled_backend() -> Result<Child, String> {
    for root in candidate_roots() {
        let Some(runtime_root) = find_portable_runtime_root(&root) else {
            continue;
        };
        let launcher_path = runtime_root.join("launcher.py");
        let python_path = runtime_root.join("python.exe");
        let working_dir = runtime_root;

        let child = Command::new(python_path)
            .arg(&launcher_path)
            .current_dir(&working_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| format!("Failed to spawn bundled backend: {error}"))?;

        return Ok(child);
    }

    Err("Bundled launcher.py or python.exe was not found near the executable.".to_string())
}

fn main() {
    if port_healthy() {
        println!(r#"{{"status":"ok","message":"backend already running on port 8060"}}"#);
        return;
    }

    let mut child = match spawn_bundled_backend() {
        Ok(child) => child,
        Err(message) => {
            eprintln!("{message}");
            std::process::exit(1);
        }
    };

    let started_at = Instant::now();
    while started_at.elapsed() < Duration::from_secs(20) {
        if port_healthy() {
            println!(r#"{{"status":"ok","message":"bundled backend became healthy"}}"#);
            let _ = child.kill();
            return;
        }
        thread::sleep(Duration::from_millis(750));
    }

    let _ = child.kill();
    eprintln!("Bundled backend did not become healthy within 20 seconds.");
    std::process::exit(1);
}
