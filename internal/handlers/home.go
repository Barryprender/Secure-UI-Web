package handlers

import (
	"context"
	"log"
	"net/http"

	"secure-ui-showcase-go/internal/templates/pages"
)

// Home renders the index/home page
func (h *Handlers) Home(w http.ResponseWriter, r *http.Request) {
	// Only handle root path
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	// Render the new home page
	pages.Home().Render(r.Context(), w)
}

// Forms renders the form components demo page
func (h *Handlers) Forms(w http.ResponseWriter, r *http.Request) {
	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Add CSRF token to context for template
	ctx := context.WithValue(r.Context(), CSRFTokenKey, csrfToken)

	pages.FormsPage(csrfToken).Render(ctx, w)
}

// Dashboard renders the dashboard page
func (h *Handlers) Dashboard(w http.ResponseWriter, r *http.Request) {
	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	users, err := h.UserDB.GetAll()
	if err != nil {
		log.Printf("failed to get users for dashboard: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.Dashboard(users, csrfToken).Render(r.Context(), w)
}

// Table renders the data table demo page
func (h *Handlers) Table(w http.ResponseWriter, r *http.Request) {
	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	users, err := h.UserDB.GetAll()
	if err != nil {
		log.Printf("failed to get users for table: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.Table(users, csrfToken).Render(r.Context(), w)
}

// Registration renders the registration form page
func (h *Handlers) Registration(w http.ResponseWriter, r *http.Request) {
	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.Registration(csrfToken).Render(r.Context(), w)
}
