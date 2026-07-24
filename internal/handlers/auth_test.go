package handlers

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"secure-ui-showcase-go/internal/database"
	"secure-ui-showcase-go/internal/middleware"
	"secure-ui-showcase-go/internal/models"
	"secure-ui-showcase-go/internal/services"
)

// newTestHandlers builds Handlers backed by a throwaway SQLite database.
// The schema is created but deliberately not seeded: seeding bcrypts ten
// users and none of them are needed here.
func newTestHandlers(t *testing.T) *Handlers {
	t.Helper()

	db, err := database.InitDatabase(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("init database: %v", err)
	}
	t.Cleanup(func() {
		if err := database.Close(db); err != nil {
			t.Errorf("close database: %v", err)
		}
	})

	userDB := models.NewUserDatabase(db)
	authService := services.NewAuthService(
		userDB,
		models.NewSessionDatabase(db),
		models.NewLoginAttemptDatabase(db),
		0, 0,
	)

	return NewHandlers(userDB, middleware.NewCSRFTokenStore(t.Context(), time.Hour), nil, authService, false)
}

// submitRegistration posts a form straight to the handler. CSRF is enforced by
// middleware in the router, so it plays no part here.
func submitRegistration(t *testing.T, h *Handlers, form url.Values) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/register", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	rec := httptest.NewRecorder()
	h.RegisterSubmit(rec, req)
	return rec
}

// validForm returns a submission that should always be accepted.
func validForm(email string) url.Values {
	return url.Values{
		"first_name": {"Ada"},
		"last_name":  {"Lovelace"},
		"email":      {email},
		"password":   {"correct-horse-battery"},
		"terms":      {"on"},
	}
}

func userCount(t *testing.T, h *Handlers) int {
	t.Helper()

	users, err := h.UserDB.GetAll()
	if err != nil {
		t.Fatalf("GetAll: %v", err)
	}
	return len(users)
}

// Regression test: an unused email address makes the availability lookup return
// models.ErrNotFound. Treating that as a failure broke every registration.
func TestRegisterSubmitCreatesUserAndStartsSession(t *testing.T) {
	h := newTestHandlers(t)
	const email = "ada@example.com"

	rec := submitRegistration(t, h, validForm(email))

	if rec.Code != http.StatusSeeOther {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusSeeOther, rec.Body.String())
	}
	if got := rec.Header().Get("Location"); got != "/dashboard" {
		t.Errorf("Location = %q, want %q", got, "/dashboard")
	}

	user, err := h.UserDB.GetByEmail(email)
	if err != nil {
		t.Fatalf("registered user not found: %v", err)
	}
	if user.PasswordHash == "" {
		t.Error("stored user has an empty password hash")
	}
	if user.PasswordHash == "correct-horse-battery" {
		t.Error("password was stored in plain text")
	}

	var session *http.Cookie
	for _, c := range rec.Result().Cookies() {
		if c.Name == middleware.SessionCookieName(false) {
			session = c
		}
	}
	if session == nil || session.Value == "" {
		t.Fatal("no session cookie set after registration")
	}
	if !session.HttpOnly {
		t.Error("session cookie is not HttpOnly")
	}
	if session.SameSite != http.SameSiteStrictMode {
		t.Errorf("session cookie SameSite = %v, want Strict", session.SameSite)
	}
}

func TestRegisterSubmitRejectsDuplicateEmail(t *testing.T) {
	h := newTestHandlers(t)
	const email = "grace@example.com"

	if rec := submitRegistration(t, h, validForm(email)); rec.Code != http.StatusSeeOther {
		t.Fatalf("first registration failed with status %d", rec.Code)
	}

	rec := submitRegistration(t, h, validForm(email))

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
	if got := userCount(t, h); got != 1 {
		t.Errorf("user count = %d, want 1", got)
	}
	// The rejection must not confirm that the address is taken.
	if body := rec.Body.String(); strings.Contains(body, email) {
		t.Error("response echoes the submitted address, allowing account enumeration")
	}
}

func TestRegisterSubmitRejectsInvalidInput(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(url.Values)
	}{
		{"malformed email", func(f url.Values) { f.Set("email", "not-an-address") }},
		{"password below minimum length", func(f url.Values) { f.Set("password", "short") }},
		{"missing first name", func(f url.Values) { f.Del("first_name") }},
		{"html in name", func(f url.Values) { f.Set("first_name", "<script>alert(1)</script>") }},
		{"mismatched confirmation", func(f url.Values) { f.Set("confirm_password", "something-else") }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := newTestHandlers(t)
			form := validForm("test@example.com")
			tt.mutate(form)

			rec := submitRegistration(t, h, form)

			if rec.Code == http.StatusSeeOther {
				t.Error("invalid submission was accepted")
			}
			if got := userCount(t, h); got != 0 {
				t.Errorf("user count = %d, want 0 — invalid input was persisted", got)
			}
		})
	}
}
