use aws_sdk_s3::types::ObjectIdentifier;
use tokio::time;

use crate::database::upload_record::UploadRecord;
use crate::state::app_state::AppState;

pub async fn prune_invalid_entries_task(state: AppState) {
    let mut interval = time::interval(time::Duration::from_mins(30));

    loop {
        interval.tick().await;
        tracing::info!("Executing prune entries...");

        let expired: Vec<UploadRecord> = match sqlx::query_as!(
            UploadRecord,
            "SELECT id, filename, content_type, size_bytes, s3_object_key, expires_at FROM uploads WHERE expires_at < NOW()"
        ).fetch_all(&state.db).await {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("Failed getting expired entries: {}", e);
                continue;
            }
        };

        if expired.len() == 0 {
            tracing::info!("No entries to prune");
            continue;
        }

        let expired_chunks = expired.chunks(1000);
        let all_expired_ids: Vec<uuid::Uuid> = expired.iter().map(|v| v.id).collect();

        for chunk in expired_chunks {
            let mut aws_ids: Vec<ObjectIdentifier> = Vec::with_capacity(chunk.len());

            for entry in chunk {
                let obj_id = match ObjectIdentifier::builder()
                    .key(&entry.s3_object_key)
                    .build()
                {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!(
                            "Couldn't make object id out of key {} with ID {}: {}\nSkipping.",
                            &entry.s3_object_key,
                            &entry.id,
                            &e
                        );
                        continue;
                    }
                };

                aws_ids.push(obj_id);
            }

            let aws_delete_type = match aws_sdk_s3::types::Delete::builder()
                .set_objects(Some(aws_ids))
                .build()
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("Couldn't make delete type: {}", e);
                    continue;
                }
            };

            let response = match state
                .s3
                .delete_objects()
                .bucket(&state.config.s3_bucket_name)
                .delete(aws_delete_type)
                .send()
                .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("Couldn't delete objects: {}", e);
                    continue;
                }
            };

            tracing::info!(
                "Deleted {} expired objects from S3",
                response.deleted().len()
            );
        }

        tracing::info!("Deleting expired entries from postgres...");

        match sqlx::query!("DELETE FROM uploads WHERE id = ANY($1)", &all_expired_ids)
            .execute(&state.db)
            .await
        {
            Ok(_) => {
                tracing::info!(
                    "Deleted {} expired objects from postgres",
                    &all_expired_ids.len()
                )
            }
            Err(e) => {
                tracing::error!("Couldn't delete expired objects from postgres: {}", e);
                continue;
            }
        };

        tracing::info!(
            "All done, purged {} expired objects in total",
            &all_expired_ids.len()
        );
    }
}
