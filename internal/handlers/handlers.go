package handlers

import (
	"encoding/json"
	"errors"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"

	"secure-ui-showcase-go/internal/middleware"
	"secure-ui-showcase-go/internal/models"
	"secure-ui-showcase-go/internal/services"
	"secure-ui-showcase-go/internal/validation"
)

// contextKey is a private type for context keys to avoid collisions.
type contextKey string

// CSRFTokenKey is the context key for CSRF tokens.
const CSRFTokenKey contextKey = "csrfToken"

// CSRFTokenGenerator interface for generating CSRF tokens
type CSRFTokenGenerator interface {
	GenerateToken() (string, error)
}

// Handlers holds all dependencies for HTTP handlers
type Handlers struct {
	UserDB         *models.UserDatabase
	CSRFStore      CSRFTokenGenerator
	CountryService *services.CountryService
	AuthService    *services.AuthService
	SecureCookie   bool // true in production (HTTPS) for __Host- cookie prefix
}

// NewHandlers creates a new Handlers instance with the given dependencies
func NewHandlers(
	userDB *models.UserDatabase,
	csrfStore CSRFTokenGenerator,
	countryService *services.CountryService,
	authService *services.AuthService,
	secureCookie bool,
) *Handlers {
	return &Handlers{
		UserDB:         userDB,
		CSRFStore:      csrfStore,
		CountryService: countryService,
		AuthService:    authService,
		SecureCookie:   secureCookie,
	}
}

// ----------------------------------------------------------------------------
// Response Helpers
// ----------------------------------------------------------------------------

// writeJSON encodes data as JSON and writes to the response
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}

// writeError writes a JSON error response
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

// writeSuccess writes a JSON success response with optional data
func writeSuccess(w http.ResponseWriter, status int, message string, data interface{}) {
	response := map[string]interface{}{
		"success": true,
	}
	if message != "" {
		response["message"] = message
	}
	if data != nil {
		response["data"] = data
	}
	writeJSON(w, status, response)
}

// writeValidationErrors writes validation errors as JSON response
func writeValidationErrors(w http.ResponseWriter, errors []validation.ValidationError) {
	writeJSON(w, http.StatusBadRequest, map[string]interface{}{
		"success": false,
		"errors":  errors,
	})
}

// errorPageData holds template data for the error page
type errorPageData struct {
	Title   string
	Errors  []validation.ValidationError
	BackURL string
	Nonce   string
}

var errorPageTmpl = template.Must(template.New("error").Parse(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}} - Secure-UI</title>
    <link rel="stylesheet" href="/static/styles/secure-ui.css">
    <style nonce="{{.Nonce}}">
        .error-container {
            max-width: 600px;
            margin: 4rem auto;
            padding: 2rem;
            background: var(--secure-ui-color-bg-secondary);
            border-radius: 8px;
        }
        .error-icon { font-size: 3rem; margin-bottom: 1rem; }
        .error-title { font-size: 1.5rem; color: var(--secure-ui-color-danger); margin-bottom: 1rem; }
        .error-list { margin: 1rem 0; list-style: none; padding: 0; }
        .error-list li { padding: 0.5rem; margin: 0.5rem 0; background: var(--secure-ui-color-bg-primary); border-left: 3px solid var(--secure-ui-color-danger); }
        .back-link {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 1.5rem;
            background: var(--secure-ui-color-primary);
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        .back-link:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">Error</div>
        <div class="error-title">{{.Title}}</div>
        <ul class="error-list">
            {{range .Errors}}<li><strong>{{.Field}}:</strong> {{.Message}}</li>
            {{end}}
        </ul>
        <a href="{{.BackURL}}" class="back-link">Go Back</a>
    </div>
</body>
</html>`))

// renderErrorPage renders an HTML error page for form submissions
func renderErrorPage(w http.ResponseWriter, r *http.Request, title string, errs []validation.ValidationError, backURL string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusBadRequest)

	if err := errorPageTmpl.Execute(w, errorPageData{
		Title:   title,
		Errors:  errs,
		BackURL: backURL,
		Nonce:   middleware.NonceFromContext(r.Context()),
	}); err != nil {
		log.Printf("failed to render error page: %v", err)
	}
}

// ----------------------------------------------------------------------------
// URL Parsing Helpers
// ----------------------------------------------------------------------------

// extractPathID extracts an ID from a URL path at the given segment index
// For example, extractPathID("/api/users/123", 2) returns 123
func extractPathID(path string, segmentIndex int) (int, error) {
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) <= segmentIndex {
		return 0, errors.New("invalid path: missing ID segment")
	}
	id, err := strconv.Atoi(pathParts[segmentIndex])
	if err != nil {
		return 0, errors.New("invalid ID: must be a number")
	}
	return id, nil
}

// extractUserID extracts the user ID from the URL path /api/users/{id}
func extractUserID(path string) (int, error) {
	return extractPathID(path, 2) // /api/users/{id} -> segment index 2
}

// ----------------------------------------------------------------------------
// CSRF Helpers
// ----------------------------------------------------------------------------

// generateCSRFToken generates a CSRF token if the store is available
func (h *Handlers) generateCSRFToken() (string, error) {
	if h.CSRFStore == nil {
		return "", nil
	}
	return h.CSRFStore.GenerateToken()
}

// ----------------------------------------------------------------------------
// Authorization Helpers
// ----------------------------------------------------------------------------

// requireAuth checks that a user is authenticated.
// Returns the user if authenticated, or writes a 401 JSON response and returns nil.
func requireAuth(w http.ResponseWriter, r *http.Request) *models.User {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return nil
	}
	return user
}

// requireAdmin checks that the authenticated user has the "admin" role.
// Returns the user if admin, or writes a 403 JSON response and returns nil.
func requireAdmin(w http.ResponseWriter, r *http.Request) *models.User {
	user := requireAuth(w, r)
	if user == nil {
		return nil
	}
	if user.Role != "admin" {
		writeError(w, http.StatusForbidden, "Admin access required")
		return nil
	}
	return user
}
