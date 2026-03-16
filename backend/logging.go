package main

import (
	"log/slog"
	"os"
)

var (
	Logger = slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{
		Level:     slog.LevelDebug,
		AddSource: true,
	}))
)
