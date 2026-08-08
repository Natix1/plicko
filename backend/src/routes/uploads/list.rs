use axum::Json;
use axum::extract::{Query, State};
use serde::{Deserialize, Serialize};

use crate::database::upload_record::UploadRecord;
use crate::state::app_error::AppError;
use crate::state::app_state::AppState;

#[derive(Serialize)]
pub struct ListResponse {
    pub uploads: Vec<UploadRecord>,
}

#[derive(Deserialize)]
pub struct ListParams {
    after: Option<uuid::Uuid>,
    limit: u32,
}

pub async fn list(
    State(state): State<AppState>,
    query: Query<ListParams>,
) -> Result<Json<ListResponse>, AppError> {
    let limit = query.limit.clamp(1, 20);
    let after = query.after.unwrap_or(uuid::Uuid::max());

    let results = sqlx::query_as!(
        UploadRecord,
        r#"
        SELECT id, filename, content_type, size_bytes, s3_object_key, expires_at 
        FROM uploads 
        WHERE expires_at > NOW()
        AND id < $1
        ORDER BY id DESC
        LIMIT $2
        "#,
        after,
        limit as i32
    )
    .fetch_all(&state.db)
    .await?;

    tracing::info!("Results: {:?}", results);

    Ok(Json(ListResponse { uploads: results }))
}
