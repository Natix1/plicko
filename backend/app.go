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
	UPLOADS_DIRECTORY   string = ""
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

	UPLOADS_DIRECTORY = getEnvDefault("UPLOADS_DIRECTORY", "/uploads")
	fmt.Println("Uploads directory: ", UPLOADS_DIRECTORY)
}

func main() {
	// public
	http.HandleFunc("GET /uploads/{file}", ReadHandler)

	// private
	http.HandleFunc("POST /uploads", Auth(WriteHandler))
	http.HandleFunc("GET /metadata/storage-total", Auth(StorageTakenHandler))

	http.ListenAndServe(BIND_ADDR, nil)
}
