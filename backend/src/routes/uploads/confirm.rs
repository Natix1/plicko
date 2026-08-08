use axum::Json;
use axum::extract::State;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::database::upload_record::UploadRecord;
use crate::state::app_error::AppError;
use crate::state::app_state::AppState;

#[derive(Deserialize, Debug)]
pub struct ConfirmFile {
    pub s3_object_key: String,
}

#[derive(Serialize, Debug)]
pub struct ConfirmFileResponse {
    pub public_uri: String,
}

#[instrument(name = "v1/uploads/confirm", skip(state))]
pub async fn confirm(
    State(state): State<AppState>,
    Json(payload): Json<ConfirmFile>,
) -> Result<Json<ConfirmFileResponse>, AppError> {
    let head = state
        .s3
        .head_object()
        .bucket(&state.config.s3_bucket_name)
        .key(payload.s3_object_key.clone())
        .send()
        .await?;

    let raw_file = payload
        .s3_object_key
        .rsplit('/')
        .next()
        .ok_or_else(|| anyhow::anyhow!("Invalid object key"))?;

    let raw_uuid = raw_file.split('.').next().unwrap_or(raw_file);
    let uuid: uuid::Uuid = raw_uuid
        .parse()
        .map_err(|_| anyhow::anyhow!("Object key does not contain a valid UUID"))?;

    let original_filename = head
        .metadata()
        .and_then(|m| m.get("filename"))
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Couldn't get original filename"))?;

    let size_bytes = head
        .content_length()
        .ok_or_else(|| anyhow::anyhow!("Couldn't get content length!"))?;

    let content_type = head
        .content_type()
        .ok_or_else(|| anyhow::anyhow!("Couldn't get content type"))?
        .to_string();

    let ext = original_filename
        .rsplit_once('.')
        .map(|(_, e)| e)
        .unwrap_or(".bin");

    let s3_object_key = format!("uploads/{uuid}.{ext}");
    let copy_source = format!("{}/{}", state.config.s3_bucket_name, payload.s3_object_key);

    state
        .s3
        .copy_object()
        .copy_source(copy_source)
        .bucket(state.config.s3_bucket_name.clone())
        .key(s3_object_key.clone())
        .send()
        .await?;

    state
        .s3
        .delete_object()
        .bucket(&state.config.s3_bucket_name)
        .key(&payload.s3_object_key)
        .send()
        .await?;

    let expires_at = Utc::now() + Duration::seconds(state.config.s3_upload_ttl as i64);
    let record = sqlx::query_as!(
        UploadRecord,
        r#"
        INSERT INTO uploads (id, filename, content_type, size_bytes, s3_object_key, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, filename, content_type, size_bytes, s3_object_key, expires_at
        "#,
        uuid,
        original_filename,
        content_type,
        size_bytes as i64,
        s3_object_key,
        expires_at
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(ConfirmFileResponse {
        public_uri: format!("{}/{}", state.config.s3_public_uri, record.s3_object_key),
    }))
}
