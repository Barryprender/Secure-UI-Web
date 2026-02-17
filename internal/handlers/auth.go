package handlers

import (
	"log"
	"net"
	"net/http"

	"secure-ui-showcase-go/internal/middleware"
	"secure-ui-showcase-go/internal/services"
	"secure-ui-showcase-go/internal/templates/pages"
	"secure-ui-showcase-go/internal/validation"
)

// cookieName returns the session cookie name based on secure mode
func (h *Handlers) cookieName() string {
	return middleware.SessionCookieName(h.SecureCookie)
}

// setSessionCookie sets the session cookie on the response
func (h *Handlers) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     h.cookieName(),
		Value:    token,
		Path:     "/",
		MaxAge:   86400, // 24 hours
		HttpOnly: true,
		Secure:   h.SecureCookie,
		SameSite: http.SameSiteStrictMode,
	})
}

// clearSessionCookie removes the session cookie
func (h *Handlers) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     h.cookieName(),
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.SecureCookie,
		SameSite: http.SameSiteStrictMode,
	})
}

// clientIPFromRequest extracts the client IP from the request.
// Uses RemoteAddr directly (no proxy header trust from handlers).
func clientIPFromRequest(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

// LoginPage renders the login form (GET /login)
func (h *Handlers) LoginPage(w http.ResponseWriter, r *http.Request) {
	// If already logged in, redirect to dashboard
	if middleware.UserFromContext(r.Context()) != nil {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}

	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.Login(csrfToken, "").Render(r.Context(), w)
}

// LoginSubmit handles login form submission (POST /login)
func (h *Handlers) LoginSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	email := validation.Sanitize(r.FormValue("email"))
	password := r.FormValue("password") // never sanitize passwords

	// Basic input validation
	v := validation.New()
	v.Required("email", email, "Email").Email("email", email, "Email")
	v.Required("password", password, "Password")
	if !v.Result().IsValid() {
		csrfToken, _ := h.generateCSRFToken()
		pages.Login(csrfToken, "Please fill in all fields correctly.").Render(r.Context(), w)
		return
	}

	ip := clientIPFromRequest(r)
	userAgent := r.UserAgent()

	token, err := h.AuthService.Login(email, password, ip, userAgent)
	if err != nil {
		// Generic error message regardless of the actual failure reason
		errMsg := "Invalid email or password."
		if err == services.ErrAccountLocked {
			errMsg = "Account temporarily locked due to too many failed attempts. Please try again later."
		}

		csrfToken, _ := h.generateCSRFToken()
		pages.Login(csrfToken, errMsg).Render(r.Context(), w)
		return
	}

	h.setSessionCookie(w, token)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// LogoutSubmit handles logout (POST /logout)
func (h *Handlers) LogoutSubmit(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.cookieName())
	if err == nil && cookie.Value != "" {
		if err := h.AuthService.Logout(cookie.Value); err != nil {
			log.Printf("failed to delete session on logout: %v", err)
		}
	}
	h.clearSessionCookie(w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// RegisterPage renders the registration form (GET /register)
func (h *Handlers) RegisterPage(w http.ResponseWriter, r *http.Request) {
	// If already logged in, redirect to dashboard
	if middleware.UserFromContext(r.Context()) != nil {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}

	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.Registration(csrfToken).Render(r.Context(), w)
}

// RegisterSubmit handles registration form submission (POST /register)
func (h *Handlers) RegisterSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	firstName := validation.Sanitize(r.FormValue("first_name"))
	lastName := validation.Sanitize(r.FormValue("last_name"))
	email := validation.Sanitize(r.FormValue("email"))
	password := r.FormValue("password")
	confirmPassword := r.FormValue("confirm_password")

	// Validate
	v := validation.New()
	v.Required("first_name", firstName, "First Name").MaxLength("first_name", firstName, 50, "First Name")
	v.Required("last_name", lastName, "Last Name").MaxLength("last_name", lastName, 50, "Last Name")
	v.Required("email", email, "Email").Email("email", email, "Email")
	v.Required("password", password, "Password").MinLength("password", password, 8, "Password")
	v.Required("confirm_password", confirmPassword, "Confirm Password")

	if password != confirmPassword {
		v.Result().AddError("confirm_password", "Passwords do not match")
	}

	if !v.Result().IsValid() {
		renderErrorPage(w, r, "Registration Errors", v.Result().Errors, "/register")
		return
	}

	_, err := h.AuthService.RegisterUser(firstName, lastName, email, password)
	if err != nil {
		// Generic error to prevent email enumeration
		renderErrorPage(w, r, "Registration Error", []validation.ValidationError{
			{Field: "general", Message: "Unable to complete registration. Please try again."},
		}, "/register")
		return
	}

	// Auto-login after successful registration
	ip := clientIPFromRequest(r)
	userAgent := r.UserAgent()
	token, err := h.AuthService.Login(email, password, ip, userAgent)
	if err != nil {
		// Registration succeeded but auto-login failed; redirect to login
		log.Printf("Auto-login failed after registration: %v", err)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	h.setSessionCookie(w, token)
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// ChangePassword handles password change form submission (POST /profile/password)
func (h *Handlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user := middleware.UserFromContext(r.Context())
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	currentPassword := r.FormValue("current_password")
	newPassword := r.FormValue("new_password")
	confirmPassword := r.FormValue("confirm_password")

	// Validate inputs
	v := validation.New()
	v.Required("current_password", currentPassword, "Current Password")
	v.Required("new_password", newPassword, "New Password").
		MinLength("new_password", newPassword, 8, "New Password")
	v.Required("confirm_password", confirmPassword, "Confirm Password")

	if newPassword != confirmPassword {
		v.Result().AddError("confirm_password", "Passwords do not match")
	}

	if !v.Result().IsValid() {
		csrfToken, _ := h.generateCSRFToken()
		pages.Profile(user, csrfToken, "Please correct the errors below.").Render(r.Context(), w)
		return
	}

	// Attempt password change (verifies current password, hashes new, invalidates sessions)
	err := h.AuthService.ChangePassword(user.ID, currentPassword, newPassword)
	if err != nil {
		errMsg := "Unable to change password. Please try again."
		if err == services.ErrInvalidCredentials {
			errMsg = "Current password is incorrect."
		}
		csrfToken, _ := h.generateCSRFToken()
		pages.Profile(user, csrfToken, errMsg).Render(r.Context(), w)
		return
	}

	// All sessions were invalidated — clear cookie and redirect to login
	h.clearSessionCookie(w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// ProfilePage renders the user profile (GET /profile, protected by RequireAuth)
func (h *Handlers) ProfilePage(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	csrfToken, err := h.generateCSRFToken()
	if err != nil {
		log.Printf("failed to generate CSRF token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	pages.Profile(user, csrfToken).Render(r.Context(), w)
}
