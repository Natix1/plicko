use std::sync::Arc;

use axum::Router;
use axum::routing::get;
use plicko_backend::routes::root;
use plicko_backend::state::appconfig::AppConfig;
use plicko_backend::state::apperror::AppError;
use plicko_backend::state::appstate::AppState;
use tower_http::trace::TraceLayer;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

#[tokio::main]
async fn main() -> Result<(), AppError> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "plicko_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Reading config...");
    let app_config = AppConfig::init()?;
    let bind_address = app_config.bind_address.clone();

    tracing::info!("Initializing app & connections...");
    let app_state = AppState::new(app_config).await?;
    let app_state_arc = Arc::new(app_state);

    let app = Router::new()
        .layer(TraceLayer::new_for_http())
        .with_state(app_state_arc)
        .route("/", get(root::root));

    tracing::info!("Provisioning listener on port {}", bind_address);
    let listener = tokio::net::TcpListener::bind(bind_address).await?;
    tracing::info!("Starting app...");
    axum::serve(listener, app).await?;

    Ok(())
}
