package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"

	"secure-ui-showcase-go/internal/database"
	"secure-ui-showcase-go/internal/handlers"
	"secure-ui-showcase-go/internal/middleware"
	"secure-ui-showcase-go/internal/models"
	"secure-ui-showcase-go/internal/services"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Get database path from environment or use default
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/secure-ui.db"
	}

	// Ensure data directory exists
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Initialize SQLite database
	db, err := database.InitDatabase(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close(db)

	// Seed sample data if database is empty
	if err := database.SeedSampleData(db); err != nil {
		log.Fatalf("Failed to seed sample data: %v", err)
	}

	// Create a context that cancels on SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	// Determine cookie security mode
	// Set SECURE_COOKIE=true only when serving over HTTPS
	secureCookie := os.Getenv("SECURE_COOKIE") == "true"

	// Create dependencies
	userDB := models.NewUserDatabase(db)
	sessionDB := models.NewSessionDatabase(db)
	loginAttemptDB := models.NewLoginAttemptDatabase(db)
	csrfStore := middleware.NewCSRFTokenStore(ctx, 1*time.Hour)

	// behindProxy=false: do not trust X-Forwarded-For/X-Real-IP by default.
	// Set to true only when running behind a trusted reverse proxy.
	behindProxy := os.Getenv("BEHIND_PROXY") == "true"
	rateLimiter := middleware.NewRateLimiter(ctx, 100, 1*time.Minute, behindProxy)
	countryService := services.NewCountryService(24 * time.Hour) // Cache for 24 hours
	authService := services.NewAuthService(userDB, sessionDB, loginAttemptDB)

	// Create handlers with dependencies injected
	h := handlers.NewHandlers(userDB, csrfStore, countryService, authService, secureCookie)

	// Session cleanup goroutine — purges expired sessions every 15 minutes
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				authService.CleanupExpiredSessions()
			}
		}
	}()

	// Auth middleware factories
	optAuth := middleware.OptionalAuth(authService, secureCookie)
	reqAuth := middleware.RequireAuth(authService, secureCookie)
	// Note: API route authorization (auth + admin checks) is enforced inside
	// individual handlers because GET and mutating methods share the same mux pattern.

	// Setup HTTP routes
	mux := http.NewServeMux()

	// --- Public page routes (wrapped in OptionalAuth for sidebar auth state) ---
	// "/" in Go's ServeMux matches all unmatched routes as a catch-all.
	// Serve home for exact "/", otherwise render a styled 404 error page.
	mux.Handle("/", optAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			h.RenderErrorPage(w, r, http.StatusNotFound)
			return
		}
		h.Home(w, r)
	})))
	mux.Handle("/forms", optAuth(http.HandlerFunc(h.Forms)))
	mux.Handle("/documentation", optAuth(http.HandlerFunc(h.Documentation)))
	mux.Handle("/documentation/", optAuth(http.HandlerFunc(h.Documentation)))
	mux.Handle("/registration", optAuth(http.HandlerFunc(h.Registration)))

	// --- Auth routes ---
	mux.Handle("/login", middleware.CSRF(csrfStore)(optAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.LoginPage(w, r)
		} else if r.Method == http.MethodPost {
			h.LoginSubmit(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))))

	mux.Handle("/register", middleware.CSRF(csrfStore)(optAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.RegisterPage(w, r)
		} else if r.Method == http.MethodPost {
			h.RegisterSubmit(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))))

	mux.Handle("/logout", middleware.CSRF(csrfStore)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			h.LogoutSubmit(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// --- Protected page routes (require authentication) ---
	mux.Handle("/dashboard", reqAuth(http.HandlerFunc(h.Dashboard)))
	mux.Handle("/table", reqAuth(http.HandlerFunc(h.Table)))
	mux.Handle("/profile", reqAuth(http.HandlerFunc(h.ProfilePage)))
	mux.Handle("/profile/password", middleware.CSRF(csrfStore)(reqAuth(http.HandlerFunc(h.ChangePassword))))

	// --- Form submission routes (with CSRF protection) ---
	userFormMux := http.NewServeMux()
	userFormMux.HandleFunc("/users", h.CreateUserFromForm)
	mux.Handle("/users", middleware.CSRF(csrfStore)(userFormMux))
	mux.Handle("/users/delete", middleware.CSRF(csrfStore)(reqAuth(http.HandlerFunc(h.DeleteUserFromForm))))

	// --- API routes ---
	// Public read-only endpoints (no auth required)
	apiMux := http.NewServeMux()
	apiMux.HandleFunc("/api/countries", h.GetCountries)
	apiMux.HandleFunc("/api/forms/submit", h.SubmitFormHandler)

	// GET /api/users — public read (visitors may view)
	// POST /api/users — requires auth
	apiMux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.GetUsers(w, r)
		} else if r.Method == http.MethodPost {
			// Auth enforced inside handler
			h.CreateUser(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// /api/users/{id} — GET is public, PUT/PATCH requires auth (self-only), DELETE requires admin
	apiMux.HandleFunc("/api/users/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.GetUser(w, r)
		} else if r.Method == http.MethodPut || r.Method == http.MethodPatch {
			// Auth enforced inside handler (self-only check)
			h.UpdateUser(w, r)
		} else if r.Method == http.MethodDelete {
			// Auth enforced inside handler (admin-only check)
			h.DeleteUser(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Apply CSRF + auth middleware to API routes
	// reqAuthAPI wraps mutating handlers; read handlers remain public
	mux.Handle("/api/", middleware.CSRF(csrfStore)(
		optAuth(apiMux),
	))


	// Favicon route - direct handler with caching
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/x-icon")
		w.Header().Set("Cache-Control", "public, max-age=31536000") // Cache for 1 year
		http.ServeFile(w, r, filepath.Join("static", "favicon.ico"))
	})

	// Static files - serve CSS, JS, images (no CSRF needed)
	// MIMETypeWrapper ensures correct Content-Type on all platforms (including minimal Linux containers)
	staticDir := filepath.Join(".", "static")
	fs := http.FileServer(http.Dir(staticDir))
	mux.Handle("/static/", http.StripPrefix("/static/", middleware.MIMETypeWrapper(fs)))

	// Serve web components from submodule (production) or sibling folder (dev)
	componentsDir := filepath.Join(".", "secure-ui-components", "dist")
	if _, err := os.Stat(componentsDir); os.IsNotExist(err) {
		componentsDir = filepath.Join("..", "secure-ui-components", "dist")
	}
	componentFS := http.FileServer(http.Dir(componentsDir))
	mux.Handle("/components/", http.StripPrefix("/components/", middleware.MIMETypeWrapper(componentFS)))

	// Apply middleware chain
	// Order matters: Security headers -> Layout CSRF -> Rate limiting -> Routes
	handler := middleware.SecurityHeadersWithHSTS(secureCookie)(
		middleware.InjectLayoutCSRF(csrfStore)(
			middleware.RateLimit(rateLimiter, h.RenderErrorPage)(mux),
		),
	)

	// Start server
	log.Println("Secure-UI Showcase Server (Go + Templ + SQLite)")
	log.Println("Server-First Architecture with Progressive Enhancement")
	log.Printf("Listening on http://localhost:%s\n", port)
	log.Printf("Database: %s\n", dbPath)
	log.Println("")
	log.Println("Page Routes:")
	log.Println("   GET  /              - Home page")
	log.Println("   GET  /forms         - Form components demo")
	log.Println("   GET  /dashboard     - Dashboard (auth required)")
	log.Println("   GET  /table         - Table demo (auth required)")
	log.Println("   GET  /registration  - Registration form")
	log.Println("   GET  /profile       - User profile (auth required)")
	log.Println("")
	log.Println("Auth Routes:")
	log.Println("   GET  /login         - Login page")
	log.Println("   POST /login         - Login submit")
	log.Println("   GET  /register      - Registration page")
	log.Println("   POST /register      - Registration submit")
	log.Println("   POST /logout        - Logout")
	log.Println("")
	log.Println("API Routes (CSRF Protected):")
	log.Println("   GET  /api/countries    - Get all countries (public)")
	log.Println("   POST /api/forms/submit - Form submission (public)")
	log.Println("   GET  /api/users        - Get all users (public)")
	log.Println("   POST /api/users        - Create new user (auth required)")
	log.Println("   GET  /api/users/:id    - Get user by ID (public)")
	log.Println("   PUT  /api/users/:id    - Update user (self or admin)")
	log.Println("   DELETE /api/users/:id  - Delete user (admin only)")
	log.Println("")
	log.Println("Press Ctrl+C to stop")

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB
	}

	// Start server in a goroutine so we can wait for shutdown signal
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Block until shutdown signal
	<-ctx.Done()
	log.Println("Shutting down server...")

	// Give outstanding requests 10 seconds to complete
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped gracefully")
}
