use chrono::{DateTime, Utc};

#[derive(Debug, sqlx::FromRow, serde::Serialize)]
pub struct UploadRecord {
    pub id: uuid::Uuid,
    pub filename: String,
    pub content_type: String,
    pub size_bytes: i64,
    pub s3_object_key: String,
    pub expires_at: DateTime<Utc>,
}
