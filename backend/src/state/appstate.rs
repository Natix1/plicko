use crate::state::appconfig::AppConfig;
use crate::state::apperror::AppError;

pub struct AppState {
    config: AppConfig,
}

impl AppState {
    pub async fn new(config: AppConfig) -> Result<AppState, AppError> {
        Ok(AppState { config })
    }
}
