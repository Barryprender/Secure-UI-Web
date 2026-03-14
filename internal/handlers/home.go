package handlers

import (
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

// Forms renders the form components demo page.
// Each demo form gets its own CSRF token so tokens are not shared — the store
// uses ConsumeToken (atomic validate+delete), so a single shared token would
// be exhausted by the first submission.
func (h *Handlers) Forms(w http.ResponseWriter, r *http.Request) {
	loginToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	subscribeToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	paymentToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.FormsPage(loginToken, subscribeToken, paymentToken).Render(r.Context(), w)
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
