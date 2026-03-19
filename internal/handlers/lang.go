package handlers

import (
	"net/http"
	"strings"

	"secure-ui-showcase-go/internal/i18n"
)

// SetLanguage handles GET /lang?l=<locale>[&return=<path>].
// It sets the lang cookie and redirects. No CSRF needed — language is not sensitive state.
func (h *Handlers) SetLanguage(w http.ResponseWriter, r *http.Request) {
	locale := i18n.Locale(r.URL.Query().Get("l"))

	// Validate against supported locales.
	supported := false
	for _, l := range i18n.Supported {
		if locale == l {
			supported = true
			break
		}
	}
	if !supported {
		locale = i18n.EN
	}

	i18n.SetCookie(w, locale, h.SecureCookie)

	// Redirect back — only allow same-origin paths.
	ret := r.URL.Query().Get("return")
	if ret == "" || !strings.HasPrefix(ret, "/") || strings.HasPrefix(ret, "//") {
		ret = "/"
	}
	http.Redirect(w, r, ret, http.StatusSeeOther)
}
