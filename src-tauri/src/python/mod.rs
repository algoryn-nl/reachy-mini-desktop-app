// Helper to build daemon arguments
// IMPORTANT: Use .venv/bin/python3 directly instead of "uv run python" to ensure
// we use the venv Python with all installed packages, not the cpython bundle
// Note: mjpython is NOT needed in headless mode (only required for MuJoCo GUI viewer)
pub fn build_daemon_args(sim_mode: bool) -> Result<Vec<String>, String> {
    // Use Python from .venv directly (not via uv run)
    // This ensures we use the venv with all installed packages
    // Note: We always use python3, even for sim mode, because we run headless (no GUI)
    #[cfg(target_os = "macos")]
    let python_cmd = ".venv/bin/python3";
    #[cfg(target_os = "linux")]
    let python_cmd = ".venv/bin/python3";
    #[cfg(target_os = "windows")]
    let python_cmd = ".venv\\Scripts\\python.exe";

    let mut args = vec![
        python_cmd.to_string(),
        "-m".to_string(),
        "reachy_mini.daemon.app.main".to_string(),
        // "--kinematics-engine".to_string(),
        // "Placo".to_string(),
        "--desktop-app-daemon".to_string(),
    ];

    if sim_mode {
        args.push("--sim".to_string());
        args.push("--headless".to_string()); // No MuJoCo window, physics only - no need for mjpython
    }

    Ok(args)
}
