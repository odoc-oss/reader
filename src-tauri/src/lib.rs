use tauri::Manager;
use tauri_plugin_shell::{process, ShellExt};
use std::fs;
use std::sync::Mutex;

// State to manage the sidecar process
struct SidecarManager {
    child: Mutex<Option<process::CommandChild>>,
}


mod commands;
mod gateway;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
        // 打开开发者工具（用于调试）
        // if let Some(window) = app.get_webview_window("main") {
        //     window.open_devtools();
        //     println!("[Tauri] DevTools opened");
        // }
        
        // 仅在 Release 模式下启动 Gateway 和 Go 后端
    if !cfg!(debug_assertions) {
        let app_handle = app.handle().clone();
        let main_window = app.get_webview_window("main").unwrap();

        // 1. 启动 Gateway
        tauri::async_runtime::spawn(async move {
            let resource_path = app_handle.path().resource_dir().unwrap();
            // Tauri places resources defined with `../` inside a `_up_` directory on all platforms.
            let dist_dir = resource_path.join("_up_").join("dist");
            
            println!("[Gateway] Serving static files from: {:?}", dist_dir);

            match gateway::start_gateway(dist_dir).await {
                Ok(_) => {
                    let url = format!("http://127.0.0.1:{}", gateway::GATEWAY_PORT);
                    println!("[Gateway] Navigating window to: {}", url);
                    let _ = main_window.navigate(url.parse().unwrap());
                }
                Err(e) => {
                    eprintln!("[Gateway] Failed to start: {}. The port might be occupied.", e);
                }
            }
        });

        let handle = app.handle().clone();
        let sidecar_manager = SidecarManager { child: Mutex::new(None) };
        app.manage(sidecar_manager);

        let app_handle_clone = app.handle().clone();
        app.get_webview_window("main").unwrap().on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(manager) = app_handle_clone.try_state::<SidecarManager>() {
                    if let Some(child) = manager.child.lock().unwrap().take() {
                        println!("[Tauri] Window close requested. Shutting down go-sea sidecar...");
                        if let Err(e) = child.kill() {
                            eprintln!("[Tauri] Failed to kill sidecar process: {}", e);
                        }
                    }
                }
            }
        });

        // 【第1步】: 确定所有需要的路径 (已按您的要求更新)
        let resource_path = app.path()
            .resource_dir()
            .expect("无法获取资源目录");

        let app_data_dir = app.path()
            .app_data_dir()
            .expect("无法获取应用数据目录");

        // 源路径: [资源目录]/resources/db/app.db (修正打包后的路径)
        let source_db_path = resource_path.join("resources").join("db").join("app.db");
        // 目标路径: [数据目录]/db/app.db
        let dest_db_path = app_data_dir.join("db").join("app.db");

        // 【第2步】: 检查数据库文件是否存在，如果不存在则从资源文件复制
        if !dest_db_path.exists() {
            println!("[Tauri] 数据库不存在，准备从模板创建...");
            
            // 获取目标数据库所在的目录: [数据目录]/db
            let dest_db_dir = app_data_dir.join("db");
            // 确保这个 'db' 子目录存在
            fs::create_dir_all(&dest_db_dir).expect("无法创建应用数据子目录 'db'");
            
            // 复制数据库模板文件
            fs::copy(&source_db_path, &dest_db_path)
                .expect(&format!("无法将数据库模板从 {:?} 复制到 {:?}", source_db_path, dest_db_path));
            println!("[Tauri] 数据库已成功创建于: {:?}", dest_db_path);
        } else {
            println!("[Tauri] 数据库已存在于: {:?}", dest_db_path);
        }

        // 2. 启动 Go 后端
        tauri::async_runtime::spawn(async move {
            let config_path = resource_path
                    .join("resources")
                    .join("config.local.develop.yaml")
                    .to_str().map(|s| s.to_string())
                    .unwrap_or_default();
            
            println!("[go-sea] 使用配置文件: {}", config_path);
            
            let data_dir_str = app_data_dir.to_str().expect("数据目录路径包含无效的UTF-8字符");
            println!("[go-sea] 数据目录: {}", data_dir_str);

            let mut args = Vec::new();
            if !config_path.is_empty() {
                args.push("-config");
                args.push(&config_path);
            }
            args.push("--local-data-dir"); // 使用您更新后的参数名
            args.push(data_dir_str);
            
            let cmd_result = handle.shell().sidecar("go-sea").map(|c| c.args(args));
            
            match cmd_result {
                Ok(cmd) => {
                    match cmd.spawn() {
                        Ok((mut rx, child)) => {
                            // Store the child process handle in the state manager
                            if let Some(manager) = handle.try_state::<SidecarManager>() {
                                *manager.child.lock().unwrap() = Some(child);
                            }
                            println!("[go-sea] 后端启动成功");
                            // ... (后续的日志监听代码保持不变)
                            tauri::async_runtime::spawn(async move {
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                                            println!("[go-sea] {}", String::from_utf8_lossy(&line));
                                        }
                                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                                            eprintln!("[go-sea] {}", String::from_utf8_lossy(&line));
                                        }
                                        tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                                            println!("[go-sea] 进程已终止，退出码: {:?}", payload.code);
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            eprintln!("[go-sea] 启动后端失败: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[go-sea] 创建 sidecar 命令失败: {}", e);
                }
            }
        });
    }
    
    Ok(())
})
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
