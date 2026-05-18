use axum::{
    body::Body,
    extract::State,
    http::{Request, Uri, StatusCode, header},
    response::{IntoResponse, Response},
    routing::any,
    Router,
};
use hyper_util::rt::TokioIo;
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::net::{TcpListener, TcpStream};
use tower_http::services::{ServeDir, ServeFile};

#[derive(Clone)]
struct AppState {
    api_target: String,
    api_host: String, // 目标后端的 host:port（不带 scheme）
}

pub const GATEWAY_PORT: u16 = 30031;

// 启动 Gateway Server
pub async fn start_gateway(dist_dir: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    // 绑定到固定的端口 127.0.0.1:30031
    let addr = SocketAddr::from(([127, 0, 0, 1], GATEWAY_PORT));
    let listener = TcpListener::bind(addr).await?;
    println!("[Gateway] Listening on port: {}", GATEWAY_PORT);

    let api_target = "http://127.0.0.1:8081".to_string();
    let api_host = api_target.trim_start_matches("http://").to_string();

    let state = AppState {
        api_target,
        api_host,
    };

    // 定义路由规则
    let app = Router::new()
        // API 路由：匹配所有 /api/ 开头的路径，优先级最高
        .route("/api/*path", any(proxy_handler))
        // 对应 Vite proxy 的 /report/collection_tracking0 配置
        .route("/report/*path", any(proxy_handler))
        // 将所有其他请求都交给 ServeDir 处理。
        // ServeDir 会首先尝试查找静态文件。
        // 如果找不到，.fallback() 会接管，并提供 index.html 文件。
        // 这是处理 SPA 路由的标准模式
        .fallback_service(
            ServeDir::new(dist_dir.clone()).fallback(ServeFile::new(dist_dir.join("index.html"))),
        )
        .with_state(state);

    // 在后台异步启动 Server
    tokio::spawn(async move {
        axum::serve(listener, app.into_make_service()).await.unwrap();
    });

    Ok(())
}

// API 请求的代理处理器
#[axum::debug_handler]
async fn proxy_handler(
    State(state): State<AppState>,
    mut req: Request<Body>,
) -> Result<Response, (StatusCode, String)> {
    let path = req.uri().path();
    let path_query = req
        .uri()
        .path_and_query()
        .map(|v| v.as_str())
        .unwrap_or(path);

    let target_uri = format!("{}{}", state.api_target, path_query);
    println!("[Gateway] Proxying {} {} -> {}", req.method(), req.uri(), target_uri);

    *req.uri_mut() = Uri::try_from(target_uri).unwrap();

    // 与 Vite dev proxy 的 changeOrigin: true 行为一致：
    // 1. 将原始 Host 保存到 X-Forwarded-Host
    if let Some(original_host) = req.headers().get(header::HOST).cloned() {
        req.headers_mut().insert(
            header::HeaderName::from_static("x-forwarded-host"),
            original_host,
        );
    }
    // 2. 修正 Host header 为目标后端地址
    req.headers_mut().insert(
        header::HOST,
        state.api_host.parse().unwrap(),
    );

    let stream = match TcpStream::connect(&state.api_host).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[Gateway] Failed to connect to backend: {}", e);
            return Err((StatusCode::BAD_GATEWAY, format!("Backend unreachable: {}", e)));
        }
    };

    let io = TokioIo::new(stream);
    let (mut sender, conn) = hyper::client::conn::http1::handshake(io).await.map_err(|e| {
        eprintln!("[Gateway] Handshake failed: {}", e);
        (StatusCode::BAD_GATEWAY, e.to_string())
    })?;
    
    tokio::task::spawn(async move {
        if let Err(err) = conn.await {
            eprintln!("[Gateway] Connection failed: {:?}", err);
        }
    });

    let response = sender.send_request(req).await.map_err(|e| {
        eprintln!("[Gateway] Request failed: {}", e);
        (StatusCode::BAD_GATEWAY, e.to_string())
    })?;

    Ok(response.into_response())
}
