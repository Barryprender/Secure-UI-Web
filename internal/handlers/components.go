package handlers

import (
	"log"
	"net/http"
	"strings"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Components renders the component showcase pages.
func (h *Handlers) Components(w http.ResponseWriter, r *http.Request) {
	// Canonical URL: redirect /components/ → /components (avoid duplicate content)
	if r.URL.Path == "/components/" {
		http.Redirect(w, r, "/components", http.StatusMovedPermanently)
		return
	}

	if r.URL.Path == "/components" {
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
		t1, err1 := h.generateCSRFToken()
		t2, err2 := h.generateCSRFToken()
		t3, err3 := h.generateCSRFToken()
		t4, err4 := h.generateCSRFToken()
		t5, err5 := h.generateCSRFToken()
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil || err5 != nil {
			log.Printf("failed to generate CSRF tokens for secure-form page: %v %v %v %v %v", err1, err2, err3, err4, err5)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		pages.ComponentSecureForm(t1, t2, t3, t4, t5).Render(r.Context(), w)
	case "secure-file-upload":
		pages.ComponentSecureFileUpload().Render(r.Context(), w)
	case "secure-datetime":
		pages.ComponentSecureDatetime().Render(r.Context(), w)
	case "secure-table":
		pages.ComponentSecureTable().Render(r.Context(), w)
	case "secure-card":
		t1, err := h.generateCSRFToken()
		if err != nil {
			log.Printf("failed to generate CSRF token for secure-card page: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		pages.ComponentSecureCard(t1).Render(r.Context(), w)
	case "secure-telemetry-provider":
		t1, err1 := h.generateCSRFToken()
		t2, err2 := h.generateCSRFToken()
		signingKey, err3 := generateSigningKey()
		if err1 != nil || err2 != nil || err3 != nil {
			log.Printf("failed to generate tokens for secure-telemetry-provider page: %v %v %v", err1, err2, err3)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		pages.ComponentSecureTelemetryProvider(t1, t2, signingKey).Render(r.Context(), w)
	case "secure-password-confirm":
		t1, err := h.generateCSRFToken()
		if err != nil {
			log.Printf("failed to generate CSRF token for secure-password-confirm page: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		pages.ComponentSecurePasswordConfirm(t1).Render(r.Context(), w)
	default:
		http.NotFound(w, r)
	}
}
