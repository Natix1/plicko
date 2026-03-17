package main

import (
	"net/http"
	"os"
	"path/filepath"
)

type StorageTakenResponse struct {
	Bytes int64 `json:"bytes"`
}

func DirSize(path string) (int64, error) {
	var size int64
	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return err
	})
	return size, err
}

func StorageTakenHandler(w http.ResponseWriter, r *http.Request) {
	size, err := DirSize(ARTIFACTS_DIRECTORY)
	if err != nil {
		HTTPError(w, http.StatusInternalServerError, "Failed getting directory size")
		return
	}

	JSONServerSuccess(w, StorageTakenResponse{
		Bytes: size,
	})
}
