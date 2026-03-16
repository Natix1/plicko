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

func JSONServerSuccess[T any](w http.ResponseWriter, value T) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	jsonified := ToJSON(value)
	w.Write(jsonified)

	Logger.Debug("Request successful", "response JSON", jsonified)
}

func ToJSON[T any](value T) json.RawMessage {
	encoded, err := json.Marshal(value)
	if err != nil {
		return JSONServerError("Failed encoding JSON")
	}

	return encoded
}

func HTTPError(w http.ResponseWriter, statusCode int, message string) {
	Logger.Debug("HTTPError called", "Status code", statusCode, "message", message)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	w.Write(JSONServerError(message))
}
