use crate::state::app_config::AppConfig;
use crate::state::app_error::AppError;
use anyhow::anyhow;
use aws_config::{BehaviorVersion, Region};
use aws_sdk_s3::Client;
use aws_sdk_s3::config::Credentials;
use aws_sdk_s3::error::SdkError;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

#[derive(Clone, Debug)]
pub struct AppState {
    pub config: AppConfig,
    pub db: PgPool,
    pub s3: Client,
}

impl AppState {
    pub async fn new(config: AppConfig) -> Result<AppState, AppError> {
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(config.postgres_conn_uri.as_str())
            .await
            .expect("Failed to connect to postgres database. Critical.");

        let s3_credentials = Credentials::new(
            config.s3_access_key_id.clone(),
            config.s3_secret_access_key.clone(),
            None,
            None,
            "Static",
        );

        let s3_config = aws_config::defaults(BehaviorVersion::latest())
            .endpoint_url(config.s3_uploads_uri.clone())
            .credentials_provider(s3_credentials)
            .region(Region::new(config.s3_region.clone()))
            .load()
            .await;

        let s3_client = Client::new(&s3_config);

        tracing::info!("Testing S3 connection...");
        let check = s3_client
            .head_object()
            .bucket(config.s3_bucket_name.clone())
            .key("test/test.txt")
            .send()
            .await;

        match check {
            Ok(_) => {}
            Err(SdkError::ServiceError(err)) if err.err().is_not_found() => {}
            Err(e) => return Err(AppError::from(anyhow!("Couldn't connect to S3: {}", e))),
        }

        tracing::info!("S3 connection healthy!");

        tracing::info!("Running migrations...");
        sqlx::migrate!().run(&db).await?;
        tracing::info!("Migrations ran!");

        Ok(AppState {
            config,
            db,
            s3: s3_client,
        })
    }
}
