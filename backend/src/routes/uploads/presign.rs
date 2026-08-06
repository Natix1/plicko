use std::collections::HashMap;
use std::time::Duration;

use aws_sdk_s3::presigning::PresigningConfig;
use axum::Json;
use axum::extract::State;
use serde::{Deserialize, Serialize};

use crate::state::app_error::AppError;
use crate::state::app_state::AppState;

#[derive(Deserialize)]
pub struct PresignFile {
    pub filename: String,
    pub content_type: String,
    pub size_bytes: u64,
}

#[derive(Serialize)]
pub struct PresignFileResponse {
    pub url: String,
    pub object_key: String,
    pub include_headers: HashMap<String, String>,
}

pub async fn presign(
    State(state): State<AppState>,
    Json(payload): Json<PresignFile>,
) -> Result<Json<PresignFileResponse>, AppError> {
    if payload.size_bytes > state.config.s3_max_upload_size {
        return Err(AppError::from(anyhow::anyhow!(
            "File exceeds maximum size limit"
        )));
    }

    let file_ext = payload.filename.split('.').last().unwrap_or("bin");
    let object_key = format!("waiting-uploads/{}.{}", uuid::Uuid::now_v7(), file_ext);
    let presigning_config = PresigningConfig::builder()
        .expires_in(Duration::from_mins(5))
        .build()?;

    let presigned_req = state
        .s3
        .put_object()
        .bucket(state.config.s3_bucket_name.as_str())
        .key(&object_key)
        .content_type(&payload.content_type)
        .metadata("filename", &payload.filename)
        .presigned(presigning_config)
        .await?;

    let mut headers = HashMap::new();
    for (name, value) in presigned_req.headers() {
        headers.insert(name.to_string(), value.to_string());
    }

    Ok(Json(PresignFileResponse {
        url: presigned_req.uri().into(),
        include_headers: headers,
        object_key,
    }))
}
