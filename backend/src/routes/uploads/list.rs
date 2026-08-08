use axum::Json;
use axum::extract::{Query, State};
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::database::upload_record::UploadRecord;
use crate::state::app_error::AppError;
use crate::state::app_state::AppState;

#[derive(Serialize, Debug)]
pub struct ListResponse {
    pub uploads: Vec<UploadRecord>,
}

#[derive(Deserialize, Debug)]
pub struct ListParams {
    after: Option<uuid::Uuid>,
    limit: u32,
}

#[instrument(name = "v1/uploads/list", skip(state))]
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

    Ok(Json(ListResponse { uploads: results }))
}
