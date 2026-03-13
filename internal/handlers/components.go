package handlers

import (
	"net/http"
	"strings"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Components renders the component showcase pages.
func (h *Handlers) Components(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/components" || r.URL.Path == "/components/" {
		pages.ComponentsIndex().Render(r.Context(), w)
		return
	}

	componentPath := strings.TrimPrefix(r.URL.Path, "/components/")
	componentPath = strings.TrimSuffix(componentPath, "/")

	switch componentPath {
	case "secure-input":
		pages.ComponentSecureInput().Render(r.Context(), w)
	case "secure-select":
		pages.ComponentSecureSelect().Render(r.Context(), w)
	case "secure-textarea":
		pages.ComponentSecureTextarea().Render(r.Context(), w)
	case "secure-form":
		pages.ComponentSecureForm().Render(r.Context(), w)
	case "secure-file-upload":
		pages.ComponentSecureFileUpload().Render(r.Context(), w)
	case "secure-datetime":
		pages.ComponentSecureDatetime().Render(r.Context(), w)
	case "secure-table":
		pages.ComponentSecureTable().Render(r.Context(), w)
	case "secure-card":
		pages.ComponentSecureCard().Render(r.Context(), w)
	case "secure-telemetry-provider":
		pages.ComponentSecureTelemetryProvider().Render(r.Context(), w)
	default:
		http.NotFound(w, r)
	}
}
