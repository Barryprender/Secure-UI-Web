package handlers

import (
	"net/http"
	"strings"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Documentation renders the main documentation index page
func (h *Handlers) Documentation(w http.ResponseWriter, r *http.Request) {
	// Handle the base documentation route
	if r.URL.Path == "/documentation" || r.URL.Path == "/documentation/" {
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
	default:
		http.NotFound(w, r)
	}
}
