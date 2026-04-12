package handlers

import (
	"log"
	"net/http"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Common HTTP error metadata
var httpErrors = map[int]struct {
	Title   string
	Message string
}{
	400: {
		Title:   "Bad Request",
		Message: "The server could not understand the request. Please check your input and try again.",
	},
	401: {
		Title:   "Unauthorised",
		Message: "You need to be logged in to access this page. Please sign in and try again.",
	},
	403: {
		Title:   "Forbidden",
		Message: "Your form token has expired or is invalid. Please go back and try again.",
	},
	404: {
		Title:   "Page Not Found",
		Message: "The page you're looking for doesn't exist or has been moved.",
	},
	405: {
		Title:   "Method Not Allowed",
		Message: "The request method is not supported for this resource.",
	},
	408: {
		Title:   "Request Timeout",
		Message: "The server timed out waiting for your request. Please try again.",
	},
	429: {
		Title:   "Too Many Requests",
		Message: "You've made too many requests. Please wait a moment and try again.",
	},
	500: {
		Title:   "Internal Server Error",
		Message: "Something went wrong on our end. Please try again later.",
	},
	502: {
		Title:   "Bad Gateway",
		Message: "The server received an invalid response. Please try again later.",
	},
	503: {
		Title:   "Service Unavailable",
		Message: "The service is temporarily unavailable. Please try again later.",
	},
	504: {
		Title:   "Gateway Timeout",
		Message: "The server took too long to respond. Please try again later.",
	},
}

// RenderErrorPage renders a styled error page for the given HTTP status code.
// Falls back to a generic error message for unknown status codes.
func (h *Handlers) RenderErrorPage(w http.ResponseWriter, r *http.Request, statusCode int) {
	info, ok := httpErrors[statusCode]
	if !ok {
		info = struct {
			Title   string
			Message string
		}{
			Title:   http.StatusText(statusCode),
			Message: "An unexpected error occurred. Please try again later.",
		}
	}

	// For POST requests (form submissions), do not set a non-2xx status code.
	// @view-transition { navigation: auto; } aborts cross-document transitions on
	// non-2xx responses, leaving the browser in a broken state. The error content
	// renders correctly at 200. For GET requests, set the real status so SEO crawlers
	// and direct URL access receive accurate HTTP semantics.
	if r.Method != http.MethodPost {
		w.WriteHeader(statusCode)
	}

	err := pages.ErrorPage(statusCode, info.Title, info.Message).Render(r.Context(), w)
	if err != nil {
		log.Printf("failed to render error page: %v", err)
		http.Error(w, info.Title, statusCode)
	}
}

// NotFoundHandler returns an http.Handler that renders the 404 error page.
func (h *Handlers) NotFoundHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.RenderErrorPage(w, r, http.StatusNotFound)
	})
}
