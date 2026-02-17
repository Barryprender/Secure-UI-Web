package middleware

import (
	"context"
	"net/http"

	"secure-ui-showcase-go/internal/models"
	"secure-ui-showcase-go/internal/services"
)

// userContextKey is a private type for the authenticated user context key
type userContextKey struct{}

// UserFromContext retrieves the authenticated user from the request context.
// Returns nil if no user is authenticated.
func UserFromContext(ctx context.Context) *models.User {
	user, _ := ctx.Value(userContextKey{}).(*models.User)
	return user
}

// SessionCookieName returns the appropriate cookie name based on secure mode.
// In production (HTTPS), uses __Host- prefix which enforces Secure + Path=/ + no Domain.
// In development (HTTP), uses a plain name since __Host- requires HTTPS.
func SessionCookieName(secure bool) string {
	if secure {
		return "__Host-session"
	}
	return "session_token"
}

// RequireAuth middleware validates the session cookie and injects the user
// into the request context. Redirects to /login if not authenticated.
func RequireAuth(authService *services.AuthService, secureCookie bool) func(http.Handler) http.Handler {
	cookieName := SessionCookieName(secureCookie)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(cookieName)
			if err != nil || cookie.Value == "" {
				http.Redirect(w, r, "/login", http.StatusSeeOther)
				return
			}

			user, err := authService.ValidateSession(cookie.Value)
			if err != nil || user == nil {
				// Clear the invalid cookie
				http.SetCookie(w, &http.Cookie{
					Name:     cookieName,
					Value:    "",
					Path:     "/",
					MaxAge:   -1,
					HttpOnly: true,
					Secure:   secureCookie,
					SameSite: http.SameSiteStrictMode,
				})
				http.Redirect(w, r, "/login", http.StatusSeeOther)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey{}, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuthAPI is like RequireAuth but returns 401 JSON instead of redirecting.
// Use this for API endpoints that return JSON responses.
func RequireAuthAPI(authService *services.AuthService, secureCookie bool) func(http.Handler) http.Handler {
	cookieName := SessionCookieName(secureCookie)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(cookieName)
			if err != nil || cookie.Value == "" {
				http.Error(w, `{"success":false,"error":"Authentication required"}`, http.StatusUnauthorized)
				return
			}

			user, err := authService.ValidateSession(cookie.Value)
			if err != nil || user == nil {
				http.SetCookie(w, &http.Cookie{
					Name:     cookieName,
					Value:    "",
					Path:     "/",
					MaxAge:   -1,
					HttpOnly: true,
					Secure:   secureCookie,
					SameSite: http.SameSiteStrictMode,
				})
				http.Error(w, `{"success":false,"error":"Authentication required"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey{}, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin middleware checks that the authenticated user has the "admin" role.
// Must be used after RequireAuth or RequireAuthAPI — the user must already be in context.
// Returns 403 JSON for API routes.
func RequireAdmin() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := UserFromContext(r.Context())
			if user == nil || user.Role != "admin" {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"success":false,"error":"Admin access required"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// OptionalAuth middleware reads the session cookie and populates the user
// in context if authenticated, but does NOT block unauthenticated requests.
// Used for pages that show different content based on auth state (e.g., sidebar).
func OptionalAuth(authService *services.AuthService, secureCookie bool) func(http.Handler) http.Handler {
	cookieName := SessionCookieName(secureCookie)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(cookieName)
			if err == nil && cookie.Value != "" {
				user, _ := authService.ValidateSession(cookie.Value)
				if user != nil {
					ctx := context.WithValue(r.Context(), userContextKey{}, user)
					r = r.WithContext(ctx)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
