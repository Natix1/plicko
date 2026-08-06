use axum::Json;
use chrono::Local;
use serde::Serialize;

use crate::state::app_error::AppError;
#[derive(Serialize)]
pub struct RootHandlerResponse {
    success: bool,
    message: String,
}

pub async fn root() -> Result<Json<RootHandlerResponse>, AppError> {
    let now = Local::now();
    let formatted = now.to_rfc3339();

    Ok(Json(RootHandlerResponse {
        success: true,
        message: format!("Hello, world! The date is {}", formatted).into(),
    }))
}
