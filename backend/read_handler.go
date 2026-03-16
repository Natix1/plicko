package main

import (
	"net/http"
	"path/filepath"
)

func ReadHandler(w http.ResponseWriter, r *http.Request) {
	file := filepath.Base(r.PathValue("file"))
	http.ServeFile(w, r, "/uploads/"+file)
}
