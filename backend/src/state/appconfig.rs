use serde::Deserialize;

use crate::state::apperror::AppError;

fn default_bind_address() -> String {
    String::from("0.0.0.0:3000")
}

#[derive(Deserialize, Debug)]
pub struct AppConfig {
    #[serde(default = "default_bind_address")]
    pub bind_address: String,
}

impl AppConfig {
    pub fn init() -> Result<Self, AppError> {
        dotenvy::dotenv().ok();
        let config = envy::from_env::<AppConfig>()?;

        Ok(config)
    }
}
