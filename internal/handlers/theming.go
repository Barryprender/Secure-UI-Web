package handlers

import (
	"net/http"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Theming renders the theming guide page.
func (h *Handlers) Theming(w http.ResponseWriter, r *http.Request) {
	pages.Theming().Render(r.Context(), w)
}
