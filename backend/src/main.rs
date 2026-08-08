use axum::routing::{get, post};
use axum::{Router, middleware};
use plicko_backend::database::prune_task;
use plicko_backend::middleware::plicko_auth;
use plicko_backend::routes::root;
use plicko_backend::routes::stats::total_size;
use plicko_backend::routes::uploads::{confirm, list, presign};
use plicko_backend::state::app_config::AppConfig;
use plicko_backend::state::app_error::AppError;
use plicko_backend::state::app_state::AppState;
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
    let protected_routes = Router::new()
        .route("/v1/uploads/presign", post(presign::presign))
        .route("/v1/uploads/confirm", post(confirm::confirm))
        .route("/v1/uploads/list", get(list::list))
        .route("/v1/stats/total-size", get(total_size::total_size))
        .route_layer(middleware::from_fn_with_state(
            app_state.clone(),
            plicko_auth::auth,
        ));

    let app = Router::new()
        .merge(protected_routes)
        .layer(TraceLayer::new_for_http())
        .with_state(app_state.clone())
        .route("/", get(root::root));

    tracing::info!("Staring prune task");
    tokio::spawn(prune_task::prune_invalid_entries_task(app_state.clone()));

    tracing::info!("Provisioning listener on port {}", bind_address);
    let listener = tokio::net::TcpListener::bind(bind_address).await?;
    tracing::info!("Starting app...");
    axum::serve(listener, app).await?;

    Ok(())
}
