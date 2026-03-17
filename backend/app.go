package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var (
	PLICKO_ENDPOINT_URL        string        = ""
	PLICKO_KEY                 string        = ""
	BIND_ADDR                  string        = ""
	ARTIFACTS_DIRECTORY        string        = ""
	POSTGRES_CONNECTION_STRING string        = ""
	POSTGRES                   *pgxpool.Pool = nil
)

func getEnvSafe(name string) string {
	val := os.Getenv(name)
	if val == "" {
		panic(fmt.Sprintf("%s not specified in environment variables!", name))
	}

	return val
}

func getEnvDefault(name string, fallback string) string {
	val := os.Getenv(name)
	if val == "" {
		return fallback
	}

	return val
}

func init() {
	godotenv.Load()

	PLICKO_ENDPOINT_URL = getEnvSafe("PLICKO_ENDPOINT_URL")
	PLICKO_KEY = getEnvSafe("PLICKO_KEY")
	BIND_ADDR = getEnvSafe("BIND_ADDR")
	POSTGRES_CONNECTION_STRING = getEnvSafe("POSTGRES_CONNECTION_STRING")

	ARTIFACTS_DIRECTORY = getEnvDefault("ARTIFACTS_DIRECTORY", "/artifacts")
	err := RunMigrations(POSTGRES_CONNECTION_STRING)
	if err != nil {
		panic("Failed running database migrations: " + err.Error())
	}

	conn, err := pgxpool.New(context.Background(), POSTGRES_CONNECTION_STRING)
	if err != nil {
		panic("Failed connecting to postgres: " + err.Error())
	}
	POSTGRES = conn

	Logger.Info("Init function ran", "artifacts directory", ARTIFACTS_DIRECTORY)
}

func main() {
	defer POSTGRES.Close()

	// public
	http.HandleFunc("GET /v1/artifacts/{id}", ReadHandler)
	http.HandleFunc("GET /assets/{file}", AssetsHandler)

	// private
	http.HandleFunc("POST /v1/uploads", Auth(WriteHandler))
	http.HandleFunc("GET /v1/metadata/storage-total", Auth(StorageTakenHandler))

	Logger.Info("Serving...")
	http.ListenAndServe(BIND_ADDR, nil)
}
