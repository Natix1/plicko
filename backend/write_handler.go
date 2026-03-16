package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

type WriteResponse struct {
	Urls []string `json:"urls"`
}

func generateRandomString() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func WriteHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 500<<20)
	if err := r.ParseMultipartForm(500 << 20); err != nil {
		HTTPError(w, http.StatusBadRequest, "failed to parse form: "+err.Error())
		return
	}

	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		HTTPError(w, http.StatusBadRequest, "No files provided")
		return
	}

	var urls []string
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			HTTPError(w, http.StatusInternalServerError, "failed to open file")
			return
		}
		defer file.Close()

		id := generateRandomString() + filepath.Ext(fileHeader.Filename)
		dst, err := os.Create(filepath.Clean(UPLOADS_DIRECTORY) + string(os.PathSeparator) + id)
		if err != nil {
			HTTPError(w, http.StatusInternalServerError, "failed to save file")
			return
		}
		defer dst.Close()

		io.Copy(dst, file)
		urls = append(urls, fmt.Sprintf("https://%s/uploads/%s", PLICKO_ENDPOINT_URL, id))
	}

	w.Write(ToJSON(WriteResponse{Urls: urls}))
}
