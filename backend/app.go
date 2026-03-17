package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

var (
	PLICKO_ENDPOINT_URL string = ""
	PLICKO_KEY          string = ""
	BIND_ADDR           string = ""
	ARTIFACTS_DIRECTORY string = ""
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

	ARTIFACTS_DIRECTORY = getEnvDefault("ARTIFACTS_DIRECTORY", "/artifacts")

	Logger.Info("Init function ran", "artifacts directory", ARTIFACTS_DIRECTORY)
}

func main() {
	// public
	http.HandleFunc("GET /uploads/{file}", ReadHandler)
	http.HandleFunc("GET /assets/{file}", AssetsHandler)

	// private
	http.HandleFunc("POST /uploads", Auth(WriteHandler))
	http.HandleFunc("GET /metadata/storage-total", Auth(StorageTakenHandler))

	Logger.Info("Serving...")
	http.ListenAndServe(BIND_ADDR, nil)
}
