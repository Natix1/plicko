package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
)

type WriteResponse struct {
	Urls                []string `json:"urls"`
	NewStorageSizeBytes int64    `json:"new_storage_size_bytes"`
}

func generateRandomString() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func uploadFileMetadata(filename string, sizeBytes int64) (string, error) {
	var id string
	err := POSTGRES.QueryRow(context.Background(), `
		INSERT INTO uploads (
			filename,
			size_bytes
		) VALUES (
			$1,
			$2
		) RETURNING id
	`, filename, sizeBytes).Scan(&id)

	if err != nil {
		return "", err
	}

	return id, nil
}

func uploadFileBlob(id string, file *multipart.File) error {
	dst, err := os.Create(filepath.Clean(ARTIFACTS_DIRECTORY) + string(os.PathSeparator) + id)
	if err != nil {
		return err
	}
	defer dst.Close()

	io.Copy(dst, *file)
	return nil
}

func WriteHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 500<<20)
	if err := r.ParseMultipartForm(500 << 20); err != nil {
		HTTPError(w, http.StatusBadRequest, "failed to parse form: "+err.Error(), err)
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		HTTPError(w, http.StatusBadRequest, "No files provided", nil)
		return
	}

	var urls []string
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			HTTPError(w, http.StatusInternalServerError, "failed to open file", err)
			return
		}
		defer file.Close()

		id, err := uploadFileMetadata(fileHeader.Filename, fileHeader.Size)
		if err != nil {
			HTTPError(w, http.StatusInternalServerError, "failed to upload file metadata", err)
			return
		}

		if err := uploadFileBlob(id, &file); err != nil {
			HTTPError(w, http.StatusInternalServerError, "failed to upload file to disk", err)
			return
		}

		urls = append(urls, fmt.Sprintf("https://%s/v1/artifacts/%s", PLICKO_ENDPOINT_URL, id))
	}

	size, err := DirSize(ARTIFACTS_DIRECTORY)
	if err != nil {
		size = -1
	}

	JSONServerSuccess(w, WriteResponse{Urls: urls, NewStorageSizeBytes: size})
}
