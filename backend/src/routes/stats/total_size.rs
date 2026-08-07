use axum::Json;
use axum::extract::State;
use serde::Serialize;

use crate::state::app_error::AppError;
use crate::state::app_state::AppState;

#[derive(Serialize)]
pub struct TotalSizeResponse {
    total_size_bytes: u64,
}

pub async fn total_size(
    State(state): State<AppState>,
) -> Result<Json<TotalSizeResponse>, AppError> {
    let size: Option<i64> =
        sqlx::query_scalar!("SELECT SUM(size_bytes)::BIGINT FROM uploads WHERE expires_at > NOW()")
            .fetch_one(&state.db)
            .await?;

    if let Some(size) = size {
        let size_u64: u64 = size
            .try_into()
            .map_err(|_| anyhow::anyhow!("Failed mapping size to u64"))?;

        Ok(Json(TotalSizeResponse {
            total_size_bytes: size_u64,
        }))
    } else {
        Ok(Json(TotalSizeResponse {
            total_size_bytes: 0,
        }))
    }
}
