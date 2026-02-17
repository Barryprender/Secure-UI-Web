package middleware

import (
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

// ValidateToken checks if a token is valid and not expired
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

			// Content Security Policy — nonce-based, no unsafe-inline
			csp := "default-src 'self'; " +
				"script-src 'self' 'nonce-" + nonce + "'; " +
				"style-src 'self' 'nonce-" + nonce + "'; " +
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

			// XSS Protection (legacy but still useful)
			w.Header().Set("X-XSS-Protection", "1; mode=block")

			// Referrer Policy - Don't leak referrer to other sites
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

			// Permissions Policy - Disable unnecessary browser features
			w.Header().Set("Permissions-Policy",
				"geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()")

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimiter implements simple in-memory rate limiting
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

// RateLimit middleware applies rate limiting
func RateLimit(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ClientIP(r, limiter.behindProxy)

			if !limiter.Allow(ip) {
				http.Error(w, "Rate limit exceeded. Please try again later.", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// CSRF middleware for protecting forms
func CSRF(store *CSRFTokenStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only check CSRF for state-changing methods
			if r.Method == "POST" || r.Method == "PUT" || r.Method == "DELETE" || r.Method == "PATCH" {
				token := r.Header.Get("X-CSRF-Token")
				if token == "" {
					token = r.FormValue("csrf_token")
				}

				if token == "" || !store.ValidateToken(token) {
					http.Error(w, "Invalid or missing CSRF token", http.StatusForbidden)
					return
				}

				// Delete token after use to prevent replay attacks
				store.DeleteToken(token)
			}

			next.ServeHTTP(w, r)
		})
	}
}
