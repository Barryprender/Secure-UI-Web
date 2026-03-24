package assets

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	mu     sync.RWMutex
	hashes map[string]string // "/static/styles/base.min.css" -> "a1b2c3d4"
	root   string
)

// Init walks staticDir and computes an 8-char SHA-256 fingerprint for every file.
// Call once at server startup before serving any requests.
func Init(staticDir string) {
	root = staticDir
	computed := make(map[string]string)

	err := filepath.WalkDir(staticDir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		h, err := hashFile(path)
		if err != nil {
			log.Printf("assets: skipping %s: %v", path, err)
			return nil
		}
		// Convert OS path to URL path: "./static/styles/foo.css" -> "/static/styles/foo.css"
		rel, _ := filepath.Rel(filepath.Dir(staticDir), path)
		urlPath := "/" + filepath.ToSlash(rel)
		computed[urlPath] = h
		return nil
	})
	if err != nil {
		log.Printf("assets: walk error: %v", err)
	}

	mu.Lock()
	hashes = computed
	mu.Unlock()

	log.Printf("assets: fingerprinted %d files in %s", len(computed), staticDir)
}

// URL returns the asset path with a ?v=<hash> cache-busting query parameter.
// If the file was not fingerprinted at Init time, the path is returned unchanged.
func URL(path string) string {
	mu.RLock()
	h, ok := hashes[path]
	mu.RUnlock()
	if !ok {
		return path
	}
	if strings.Contains(path, "?") {
		return path + "&v=" + h
	}
	return path + "?v=" + h
}

func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil))[:8], nil
}
