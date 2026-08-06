use serde::Deserialize;

use crate::state::app_error::AppError;

fn default_upload_ttl() -> u64 {
    14 * 24 * 60 * 60
}

fn default_max_upload_size() -> u64 {
    250 * 1024 * 1024
}

fn default_bind_address() -> String {
    String::from("0.0.0.0:3000")
}

fn default_s3_region() -> String {
    String::from("auto")
}

#[derive(Deserialize, Debug, Clone)]
pub struct AppConfig {
    #[serde(default = "default_bind_address")]
    pub bind_address: String,
    pub postgres_conn_uri: String,
    pub s3_public_uri: String,
    pub s3_uploads_uri: String,
    pub s3_access_key_id: String,
    pub s3_secret_access_key: String,
    #[serde(default = "default_s3_region")]
    pub s3_region: String,
    pub s3_bucket_name: String,
    pub plicko_access_key: String,
    #[serde(default = "default_max_upload_size")]
    pub s3_max_upload_size: u64,
    #[serde(default = "default_upload_ttl")]
    pub s3_upload_ttl: u64,
}

impl AppConfig {
    pub fn init() -> Result<Self, AppError> {
        dotenvy::dotenv().ok();
        let config = envy::from_env::<AppConfig>()?;

        Ok(config)
    }
}
