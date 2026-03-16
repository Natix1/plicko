package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func Auth(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("x-plicko-key")
		if authHeader != PLICKO_KEY {
			HTTPError(w, http.StatusUnauthorized, "Invalid plicko key")
			return
		}

		handler(w, r)
	}
}

func JSONServerError(message string) json.RawMessage {
	return []byte(fmt.Sprintf("{\"error\": \"Server error: %s\"}", message))
}

func ToJSON[T any](value T) json.RawMessage {
	encoded, err := json.Marshal(value)
	if err != nil {
		return JSONServerError("Failed encoding JSON")
	}

	return encoded
}

func HTTPError(w http.ResponseWriter, statusCode int, message string) {
	w.WriteHeader(statusCode)
	w.Write(JSONServerError(message))
}
