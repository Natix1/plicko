package main

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
)

const (
	DEFAULT_ENTRIES_LIMIT = 20
)

type Artifact struct {
	Id         string    `json:"id" db:"id"`
	Filename   string    `json:"filename" db:"filename"`
	SizeBytes  int64     `json:"size_bytes" db:"size_bytes"`
	UploadedAt time.Time `json:"uploaded_at" db:"uploaded_at"`
}

func getArtifacts(limit int, after time.Time) ([]Artifact, error) {
	rows, err := POSTGRES.Query(context.Background(),
		`
		SELECT * FROM uploads
		WHERE
		LIMIT $1
		`,
		limit)
	if err != nil {
		return []Artifact{}, err
	}

	artifacts, err := pgx.CollectRows(rows, pgx.RowToStructByName[Artifact])
	if err != nil {
		return []Artifact{}, err
	}

	return artifacts, nil
}

func ListHandler(w http.ResponseWriter, r *http.Request) {
	var entriesLimit int = DEFAULT_ENTRIES_LIMIT
	var afterTime time.Time = time.Unix(0, 0)

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			entriesLimit = limit
		}
	}

	if afterStr := r.URL.Query().Get("after"); afterStr != "" {
		if after, err := strconv.Atoi(afterStr); err != nil {
			afterTime = time.Unix(int64(after), 0)
		}
	}

	if entriesLimit > 100 {
		entriesLimit = 100
	}

	if entriesLimit < 1 {
		entriesLimit = 1
	}

	artifacts, err := getArtifacts(entriesLimit, afterTime)
	if err != nil {
		HTTPError(w, http.StatusInternalServerError, "failed getting rows", err)
		return
	}

	JSONServerSuccess(w, artifacts)
}
