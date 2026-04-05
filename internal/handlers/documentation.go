package handlers

import (
	"net/http"
	"strings"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Documentation renders the main documentation index page
func (h *Handlers) Documentation(w http.ResponseWriter, r *http.Request) {
	// Canonical URL: redirect /documentation/ → /documentation (avoid duplicate content)
	if r.URL.Path == "/documentation/" {
		http.Redirect(w, r, "/documentation", http.StatusMovedPermanently)
		return
	}

	// Handle the base documentation route
	if r.URL.Path == "/documentation" {
		pages.Documentation().Render(r.Context(), w)
		return
	}

	// Handle component-specific documentation routes
	componentPath := strings.TrimPrefix(r.URL.Path, "/documentation/")
	componentPath = strings.TrimSuffix(componentPath, "/")

	switch componentPath {
	case "secure-input":
		pages.DocsSecureInput().Render(r.Context(), w)
	case "secure-select":
		pages.DocsSecureSelect().Render(r.Context(), w)
	case "secure-textarea":
		pages.DocsSecureTextarea().Render(r.Context(), w)
	case "secure-form":
		pages.DocsSecureForm().Render(r.Context(), w)
	case "secure-file-upload":
		pages.DocsSecureFileUpload().Render(r.Context(), w)
	case "secure-datetime":
		pages.DocsSecureDatetime().Render(r.Context(), w)
	case "secure-table":
		pages.DocsSecureTable().Render(r.Context(), w)
	case "secure-card":
		pages.DocsSecureCard().Render(r.Context(), w)
	case "secure-telemetry-provider":
		pages.DocsSecureTelemetryProvider().Render(r.Context(), w)
	case "secure-password-confirm":
		pages.DocsSecurePasswordConfirm().Render(r.Context(), w)
	default:
		http.NotFound(w, r)
	}
}
