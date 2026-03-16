package main

import (
	"net/http"
	"path/filepath"
)

func AssetsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	file := filepath.Base(r.PathValue("file"))
	http.ServeFile(w, r, "./assets/"+file)
}
