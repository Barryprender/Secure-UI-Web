package middleware

import (
	"compress/gzip"
	"context"
	"crypto/rand"
	"encoding/base64"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// CSRFTokenStore manages CSRF tokens with expiration
type CSRFTokenStore struct {
	tokens map[string]time.Time
	mu     sync.Mutex
	ttl    time.Duration
}

// NewCSRFTokenStore creates a new CSRF token store.
// The cleanup goroutine stops when ctx is cancelled.
func NewCSRFTokenStore(ctx context.Context, ttl time.Duration) *CSRFTokenStore {
	store := &CSRFTokenStore{
		tokens: make(map[string]time.Time),
		ttl:    ttl,
	}

	// Clean up expired tokens every 5 minutes
	go store.cleanupExpiredTokens(ctx)

	return store
}

// GenerateToken creates a new CSRF token
func (s *CSRFTokenStore) GenerateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	token := base64.URLEncoding.EncodeToString(b)

	s.mu.Lock()
	s.tokens[token] = time.Now().Add(s.ttl)
	s.mu.Unlock()

	return token, nil
}

// ValidateToken checks if a token is valid and not expired without consuming it.
// Prefer ConsumeToken for form/API validation to prevent replay attacks.
func (s *CSRFTokenStore) ValidateToken(token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	expiry, exists := s.tokens[token]
	if !exists {
		return false
	}

	if time.Now().After(expiry) {
		delete(s.tokens, token)
		return false
	}

	return true
}

// ConsumeToken atomically validates and deletes a token.
// Use this for form/API submissions to prevent replay attacks.
func (s *CSRFTokenStore) ConsumeToken(token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	expiry, exists := s.tokens[token]
	if !exists {
		return false
	}

	delete(s.tokens, token)

	return !time.Now().After(expiry)
}

// DeleteToken removes a token after use
func (s *CSRFTokenStore) DeleteToken(token string) {
	s.mu.Lock()
	delete(s.tokens, token)
	s.mu.Unlock()
}

// cleanupExpiredTokens removes expired tokens periodically until ctx is cancelled
func (s *CSRFTokenStore) cleanupExpiredTokens(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			s.mu.Lock()
			for token, expiry := range s.tokens {
				if now.After(expiry) {
					delete(s.tokens, token)
				}
			}
			s.mu.Unlock()
		}
	}
}

// nonceKey is a private type for the CSP nonce context key.
type nonceKey struct{}

// siteBaseURLKey is a private type for the site base URL context key.
type siteBaseURLKey struct{}

// canonicalURLKey is a private type for the canonical page URL context key.
type canonicalURLKey struct{}

// SiteBaseURLFromContext extracts the site base URL (scheme://host) from the request context.
func SiteBaseURLFromContext(ctx context.Context) string {
	if u, ok := ctx.Value(siteBaseURLKey{}).(string); ok {
		return u
	}
	return ""
}

// CanonicalURLFromContext extracts the canonical page URL from the request context.
func CanonicalURLFromContext(ctx context.Context) string {
	if u, ok := ctx.Value(canonicalURLKey{}).(string); ok {
		return u
	}
	return ""
}

// InjectSiteURL derives the site base URL and canonical page URL from the request
// and stores both in the context for use by templates.
func InjectSiteURL(httpsMode bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			scheme := "http"
			if httpsMode || r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
				scheme = "https"
			}
			baseURL := scheme + "://" + r.Host
			canonicalURL := baseURL + r.URL.Path
			ctx := context.WithValue(r.Context(), siteBaseURLKey{}, baseURL)
			ctx = context.WithValue(ctx, canonicalURLKey{}, canonicalURL)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// NonceFromContext extracts the CSP nonce from the request context.
func NonceFromContext(ctx context.Context) string {
	if nonce, ok := ctx.Value(nonceKey{}).(string); ok {
		return nonce
	}
	return ""
}

// layoutCSRFKey is a private type for the layout-level CSRF token context key.
type layoutCSRFKey struct{}

// LayoutCSRFFromContext extracts the layout CSRF token from the request context.
// This token is used by the navbar logout form and other layout-level forms.
func LayoutCSRFFromContext(ctx context.Context) string {
	if token, ok := ctx.Value(layoutCSRFKey{}).(string); ok {
		return token
	}
	return ""
}

// InjectLayoutCSRF generates a CSRF token per request and stores it in context
// so layout-level templates (e.g. navbar logout) can include it.
func InjectLayoutCSRF(store *CSRFTokenStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := store.GenerateToken()
			if err != nil {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			r = r.WithContext(context.WithValue(r.Context(), layoutCSRFKey{}, token))
			next.ServeHTTP(w, r)
		})
	}
}

// mimeTypes maps file extensions to correct MIME types.
// Go's http.FileServer relies on the OS MIME database which can be
// incomplete on minimal Linux containers (e.g. Render, Docker Alpine).
var mimeTypes = map[string]string{
	".css":  "text/css; charset=utf-8",
	".js":   "text/javascript; charset=utf-8",
	".mjs":  "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg":  "image/svg+xml",
	".png":  "image/png",
	".ico":  "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".map":  "application/json",
}

// staticCacheMaxAge maps file extensions to Cache-Control max-age values.
// Fonts and images are immutable in practice; CSS/JS may change between deploys.
var staticCacheMaxAge = map[string]string{
	".css":  "public, max-age=31536000, immutable", // 1 year — content-hashed
	".js":   "public, max-age=31536000, immutable", // 1 year — content-hashed
	".mjs":  "public, max-age=31536000, immutable", // 1 year — content-hashed
	".png":   "public, max-age=31536000", // 1 year
	".svg":   "public, max-age=31536000", // 1 year
	".ico":   "public, max-age=31536000", // 1 year
	".woff":  "public, max-age=31536000", // 1 year
	".woff2": "public, max-age=31536000", // 1 year
}

// MIMETypeWrapper wraps an http.Handler and sets the correct Content-Type
// and Cache-Control headers based on file extension before delegating to the
// inner handler. This ensures correct MIME types regardless of the host OS
// MIME database, and appropriate caching for static assets.
func MIMETypeWrapper(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		for ext, mime := range mimeTypes {
			if strings.HasSuffix(path, ext) {
				w.Header().Set("Content-Type", mime)
				break
			}
		}
		for ext, cc := range staticCacheMaxAge {
			if strings.HasSuffix(path, ext) {
				w.Header().Set("Cache-Control", cc)
				w.Header().Set("Vary", "Accept-Encoding")
				break
			}
		}
		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders adds comprehensive security headers to all responses.
// A unique CSP nonce is generated per request and stored in the context.
func SecurityHeaders(next http.Handler) http.Handler {
	return SecurityHeadersWithHSTS(false)(next)
}

// SecurityHeadersWithHSTS returns a middleware that adds security headers.
// When httpsMode is true, HSTS is enabled to enforce HTTPS connections.
func SecurityHeadersWithHSTS(httpsMode bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Generate a unique nonce for this request
			b := make([]byte, 16)
			if _, err := rand.Read(b); err != nil {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			}
			nonce := base64.StdEncoding.EncodeToString(b)

			// Store nonce in request context for templates
			r = r.WithContext(context.WithValue(r.Context(), nonceKey{}, nonce))

			// Content Security Policy — nonce-based, no unsafe-inline.
			// Fonts are self-hosted so no Google Fonts domains needed.
			// style-src needs no nonce: all styles are external files (no <style nonce>).
			csp := "default-src 'self'; " +
				"script-src 'self' 'nonce-" + nonce + "'; " +
				"style-src 'self'; " +
				"img-src 'self' data:; " +
				"connect-src 'self'; " +
				"font-src 'self'; " +
				"object-src 'none'; " +
				"frame-ancestors 'none'; " +
				"base-uri 'self'; " +
				"form-action 'self'"
			w.Header().Set("Content-Security-Policy", csp)

			// HSTS - Force HTTPS (enabled when running in HTTPS mode)
			if httpsMode {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
			}

			// Prevent clickjacking
			w.Header().Set("X-Frame-Options", "DENY")

			// Prevent MIME sniffing
			w.Header().Set("X-Content-Type-Options", "nosniff")

			// Referrer Policy - Don't leak referrer to other sites
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

			// Permissions Policy - Disable unnecessary browser features
			w.Header().Set("Permissions-Policy",
				"geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()")

			// HTML pages: must-revalidate so browsers issue conditional requests
			// on repeat visits rather than relying on heuristic caching.
			// Static assets get their own Cache-Control via MIMETypeWrapper.
			path := r.URL.Path
			if !strings.HasPrefix(path, "/static/") && !strings.HasPrefix(path, "/components/") {
				w.Header().Set("Cache-Control", "no-cache")
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimiter implements simple in-memory rate limiting.
// The requests map grows at most one entry per unique IP per window.
// The cleanup goroutine (every 1 minute) evicts IPs with no recent requests,
// bounding memory to O(active unique IPs within the current window).
type RateLimiter struct {
	requests     map[string][]time.Time
	mu           sync.Mutex
	limit        int
	window       time.Duration
	behindProxy  bool
}

// NewRateLimiter creates a new rate limiter.
// Set behindProxy to true only when running behind a trusted reverse proxy
// that sets X-Forwarded-For / X-Real-IP headers.
// The cleanup goroutine stops when ctx is cancelled.
func NewRateLimiter(ctx context.Context, limit int, window time.Duration, behindProxy bool) *RateLimiter {
	limiter := &RateLimiter{
		requests:    make(map[string][]time.Time),
		limit:       limit,
		window:      window,
		behindProxy: behindProxy,
	}

	// Clean up old entries every minute
	go limiter.cleanupOldEntries(ctx)

	return limiter
}

// Allow checks if a request from the given IP should be allowed
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Filter in-place — reuse the existing slice
	requests := rl.requests[ip]
	n := 0
	for _, t := range requests {
		if t.After(cutoff) {
			requests[n] = t
			n++
		}
	}
	requests = requests[:n]

	// Check if limit exceeded
	if len(requests) >= rl.limit {
		rl.requests[ip] = requests
		return false
	}

	// Add current request
	rl.requests[ip] = append(requests, now)

	return true
}

// cleanupOldEntries removes old rate limit entries until ctx is cancelled
func (rl *RateLimiter) cleanupOldEntries(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now()
			cutoff := now.Add(-rl.window)

			rl.mu.Lock()
			for ip, requests := range rl.requests {
				n := 0
				for _, t := range requests {
					if t.After(cutoff) {
						requests[n] = t
						n++
					}
				}
				if n == 0 {
					delete(rl.requests, ip)
				} else {
					rl.requests[ip] = requests[:n]
				}
			}
			rl.mu.Unlock()
		}
	}
}

// clientIP extracts the client IP from the request.
// When behindProxy is true, it checks X-Forwarded-For and X-Real-IP
// headers (only safe when a trusted reverse proxy sets these).
// When behindProxy is false, it uses RemoteAddr directly to prevent
// clients from spoofing their IP via headers.
func ClientIP(r *http.Request, behindProxy bool) string {
	if behindProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			// X-Forwarded-For may contain: "client, proxy1, proxy2"
			if i := strings.IndexByte(xff, ','); i > 0 {
				return strings.TrimSpace(xff[:i])
			}
			return strings.TrimSpace(xff)
		}
		if xri := r.Header.Get("X-Real-IP"); xri != "" {
			return strings.TrimSpace(xri)
		}
	}
	// RemoteAddr is "host:port"; strip the port
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

// ErrorRenderer is a function that renders a styled error page.
// This allows the middleware to render error pages without importing
// the handlers or templates packages (avoiding circular dependencies).
type ErrorRenderer func(w http.ResponseWriter, r *http.Request, statusCode int)

// RateLimit middleware applies rate limiting.
// Static assets (/static/, /components/, /favicon.ico) are exempt so that
// error pages can load their CSS/JS even when the limit is exceeded.
// If onLimitExceeded is nil, a plain-text 429 response is returned.
func RateLimit(limiter *RateLimiter, onLimitExceeded ErrorRenderer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow static assets through without rate limiting
			path := r.URL.Path
			if strings.HasPrefix(path, "/static/") ||
				strings.HasPrefix(path, "/components/") ||
				path == "/favicon.ico" || path == "/favicon.svg" {
				next.ServeHTTP(w, r)
				return
			}

			ip := ClientIP(r, limiter.behindProxy)

			if !limiter.Allow(ip) {
				if onLimitExceeded != nil {
					onLimitExceeded(w, r, http.StatusTooManyRequests)
				} else {
					http.Error(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
				}
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CSRF middleware for protecting forms.
// If onError is non-nil it is called on token failure; otherwise a plain-text 403 is returned.
func CSRF(store *CSRFTokenStore, onError ErrorRenderer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only check CSRF for state-changing methods
			if r.Method == "POST" || r.Method == "PUT" || r.Method == "DELETE" || r.Method == "PATCH" {
				token := r.Header.Get("X-CSRF-Token")
				if token == "" {
					token = r.FormValue("csrf_token")
				}

				if token == "" || !store.ConsumeToken(token) {
					if onError != nil {
						onError(w, r, http.StatusForbidden)
					} else {
						http.Error(w, "Invalid or missing CSRF token", http.StatusForbidden)
					}
					return
				}

			}

			next.ServeHTTP(w, r)
		})
	}
}

// gzipResponseWriter wraps http.ResponseWriter to write through a gzip compressor.
type gzipResponseWriter struct {
	http.ResponseWriter
	gz      *gzip.Writer
	sniffed bool
}

func (grw *gzipResponseWriter) WriteHeader(code int) {
	grw.Header().Del("Content-Length")
	grw.ResponseWriter.WriteHeader(code)
}

func (grw *gzipResponseWriter) Write(b []byte) (int, error) {
	// On the first write, sniff Content-Type from the original uncompressed bytes.
	// Without this, Go's http package sniffs the gzip magic bytes (0x1f 0x8b) and
	// sets an incorrect Content-Type, causing browsers to display raw data.
	if !grw.sniffed {
		grw.sniffed = true
		if grw.Header().Get("Content-Type") == "" {
			grw.Header().Set("Content-Type", http.DetectContentType(b))
		}
	}
	return grw.gz.Write(b)
}

func (grw *gzipResponseWriter) Flush() {
	_ = grw.gz.Flush()
	if f, ok := grw.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// compressibleExt is the set of file extensions that benefit from gzip compression.
// Binary formats (images, pre-compressed fonts) are excluded.
var compressibleExt = map[string]bool{
	".html": true, ".css": true, ".js": true, ".mjs": true,
	".json": true, ".xml": true, ".svg": true, ".txt": true, ".map": true,
}

// GZip adds gzip compression for text-based responses when the client supports it.
// Binary formats (images, fonts, video) are passed through uncompressed.
func GZip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}
		// Determine extension; no extension means a dynamic HTML page.
		path := r.URL.Path
		ext := ""
		if i := strings.LastIndexByte(path, '.'); i >= 0 && i > strings.LastIndexByte(path, '/') {
			ext = strings.ToLower(path[i:])
		}
		if ext != "" && !compressibleExt[ext] {
			next.ServeHTTP(w, r)
			return
		}
		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		defer gz.Close()
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Add("Vary", "Accept-Encoding")
		next.ServeHTTP(&gzipResponseWriter{ResponseWriter: w, gz: gz}, r)
	})
}
