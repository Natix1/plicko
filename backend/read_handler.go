package main

import (
	"context"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5"
)

func GetFileName(id string) (string, error) {
	var fileName string
	err := POSTGRES.QueryRow(context.Background(), `
		SELECT filename FROM uploads WHERE id = $1 LIMIT 1
	`, id).Scan(&fileName)

	if err != nil {
		return "", err
	}

	return fileName, nil
}

func ReadHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	fileName, err := GetFileName(id)
	if err != nil {
		if err == pgx.ErrNoRows {
			HTTPError(w, http.StatusNotFound, "This file was not found", err)
			return
		}

		HTTPError(w, http.StatusInternalServerError, "something went wrong", err)
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
	http.ServeFile(w, r, ARTIFACTS_DIRECTORY+"/"+id)
}
