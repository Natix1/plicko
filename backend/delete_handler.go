package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5"
)

func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := POSTGRES.Query(context.Background(), `
		DELETE FROM uploads
		WHERE id = $1
	`, id)

	if err != nil {
		if err == pgx.ErrNoRows {
			HTTPError(w, http.StatusNotFound, "this upload was not found", nil)
		} else {
			HTTPError(w, http.StatusInternalServerError, "something went wrong while trying to delete this upload", err)
		}

		return
	}

	err = os.Remove(fmt.Sprintf("%s/%s", ARTIFACTS_DIRECTORY, filepath.Base(id)))
	if err != nil {
		HTTPError(w, http.StatusInternalServerError, "failed deleting the while from disk", err)
		return
	}

	JSONServerSuccess(w, []any{})
}
