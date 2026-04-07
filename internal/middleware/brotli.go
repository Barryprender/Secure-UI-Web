package middleware

import (
	"compress/gzip"
	"net/http"
	"strings"

	"github.com/andybalholm/brotli"
)

// brotliResponseWriter wraps http.ResponseWriter to write through a brotli compressor.
type brotliResponseWriter struct {
	http.ResponseWriter
	bw      *brotli.Writer
	sniffed bool
}

func (brw *brotliResponseWriter) WriteHeader(code int) {
	brw.Header().Del("Content-Length")
	brw.ResponseWriter.WriteHeader(code)
}

func (brw *brotliResponseWriter) Write(b []byte) (int, error) {
	if !brw.sniffed {
		brw.sniffed = true
		if brw.Header().Get("Content-Type") == "" {
			brw.Header().Set("Content-Type", http.DetectContentType(b))
		}
	}
	return brw.bw.Write(b)
}

func (brw *brotliResponseWriter) Flush() {
	_ = brw.bw.Flush()
	if f, ok := brw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Compress selects the best available content encoding per request:
// brotli (br) if the client supports it, gzip otherwise.
// Binary formats (images, fonts, video) are passed through uncompressed.
// Replaces the standalone GZip middleware — use Compress in the chain instead.
func Compress(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ae := r.Header.Get("Accept-Encoding")
		if ae == "" {
			next.ServeHTTP(w, r)
			return
		}

		path := r.URL.Path
		ext := ""
		if i := strings.LastIndexByte(path, '.'); i >= 0 && i > strings.LastIndexByte(path, '/') {
			ext = strings.ToLower(path[i:])
		}
		if ext != "" && !compressibleExt[ext] {
			next.ServeHTTP(w, r)
			return
		}

		if strings.Contains(ae, "br") {
			bw := brotli.NewWriterLevel(w, brotli.DefaultCompression)
			defer func() { _ = bw.Close() }()
			w.Header().Set("Content-Encoding", "br")
			w.Header().Add("Vary", "Accept-Encoding")
			next.ServeHTTP(&brotliResponseWriter{ResponseWriter: w, bw: bw}, r)
			return
		}

		if strings.Contains(ae, "gzip") {
			gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			defer gz.Close()
			w.Header().Set("Content-Encoding", "gzip")
			w.Header().Add("Vary", "Accept-Encoding")
			next.ServeHTTP(&gzipResponseWriter{ResponseWriter: w, gz: gz}, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}
