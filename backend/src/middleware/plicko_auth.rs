use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;

use crate::state::app_state::AppState;

pub async fn auth(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let access_key = match request
        .headers()
        .get("x-api-key")
        .and_then(|val| val.to_str().ok())
    {
        Some(header) => header,
        _ => {
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    if access_key != state.config.plicko_access_key.as_str() {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(request).await)
}
