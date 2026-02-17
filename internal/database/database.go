package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite" // Pure Go SQLite driver (no CGO required)

	"golang.org/x/crypto/bcrypt"
)

// InitDatabase initializes the SQLite database connection and creates tables
func InitDatabase(dbPath string) (*sql.DB, error) {
	// Open database connection
	// Using modernc.org/sqlite (pure Go implementation, no CGO)
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// SQLite is single-writer; one connection avoids "database is locked" errors
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0) // reuse the single connection indefinitely

	// Test connection
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Harden SQLite with security and performance PRAGMAs
	pragmas := []string{
		"PRAGMA journal_mode=WAL",    // Write-Ahead Logging for concurrent reads
		"PRAGMA foreign_keys=ON",     // Enforce foreign key constraints
		"PRAGMA secure_delete=ON",    // Zero-fill deleted data on disk
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			return nil, fmt.Errorf("failed to set %s: %w", p, err)
		}
	}

	// Create schema
	if err = createSchema(db); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	log.Printf("SQLite database initialized: %s", dbPath)

	return db, nil
}

// createSchema creates the database tables if they don't exist
func createSchema(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL DEFAULT '',
		role TEXT NOT NULL CHECK(role IN ('admin', 'moderator', 'user')),
		status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'pending')),
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
	CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
	`

	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("failed to execute users schema: %w", err)
	}

	// Additive migration: add password_hash if upgrading from old schema
	_, err := db.Exec("SELECT password_hash FROM users LIMIT 1")
	if err != nil {
		if _, err := db.Exec("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"); err != nil {
			return fmt.Errorf("failed to add password_hash column: %w", err)
		}
		log.Println("Added password_hash column to users table")
	}

	// Sessions table for auth
	sessionsSchema := `
	CREATE TABLE IF NOT EXISTS sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		token TEXT NOT NULL UNIQUE,
		ip_address TEXT NOT NULL,
		user_agent TEXT NOT NULL DEFAULT '',
		expires_at DATETIME NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
	CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
	CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
	`
	if _, err := db.Exec(sessionsSchema); err != nil {
		return fmt.Errorf("failed to create sessions schema: %w", err)
	}

	// Login attempts table for account lockout and audit
	loginAttemptsSchema := `
	CREATE TABLE IF NOT EXISTS login_attempts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL,
		ip_address TEXT NOT NULL,
		user_agent TEXT NOT NULL DEFAULT '',
		success INTEGER NOT NULL DEFAULT 0,
		attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
	CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
	CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);
	`
	if _, err := db.Exec(loginAttemptsSchema); err != nil {
		return fmt.Errorf("failed to create login_attempts schema: %w", err)
	}

	return nil
}

// hashPassword creates a bcrypt hash for seed data
func hashPassword(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("failed to hash seed password: %v", err)
	}
	return string(hash)
}

// SeedSampleData inserts sample users if the table is empty
func SeedSampleData(db *sql.DB) error {
	// Check if data already exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to count users: %w", err)
	}

	// Only seed if table is empty
	if count > 0 {
		log.Printf("Database already contains %d users, skipping seed", count)
		return nil
	}

	log.Println("Seeding database with sample data...")

	// All seed users get the password "password123" (bcrypt hashed)
	defaultHash := hashPassword("password123")

	sampleUsers := []struct {
		firstName    string
		lastName     string
		email        string
		passwordHash string
		role         string
		status       string
		createdAt    string
	}{
		{"John", "Doe", "john.doe@example.com", defaultHash, "admin", "active", "2024-01-15 10:30:00"},
		{"Jane", "Smith", "jane.smith@example.com", defaultHash, "admin", "active", "2024-02-20 14:45:00"},
		{"Bob", "Johnson", "bob.j@example.com", defaultHash, "moderator", "active", "2024-03-10 09:15:00"},
		{"Alice", "Williams", "alice.w@example.com", defaultHash, "moderator", "active", "2024-04-05 16:20:00"},
		{"Charlie", "Brown", "charlie.b@example.com", defaultHash, "moderator", "inactive", "2024-05-12 11:00:00"},
		{"Diana", "Miller", "diana.m@example.com", defaultHash, "user", "active", "2024-06-18 13:30:00"},
		{"Eve", "Davis", "eve.d@example.com", defaultHash, "user", "active", "2024-07-22 10:45:00"},
		{"Frank", "Garcia", "frank.g@example.com", defaultHash, "user", "pending", "2024-08-30 15:10:00"},
		{"Grace", "Martinez", "grace.m@example.com", defaultHash, "user", "active", "2024-09-14 09:25:00"},
		{"Henry", "Anderson", "henry.a@example.com", defaultHash, "user", "active", "2024-10-01 14:50:00"},
	}

	// Begin transaction for atomic insertion
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Rollback if not committed

	stmt, err := tx.Prepare(`
		INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, user := range sampleUsers {
		_, err = stmt.Exec(
			user.firstName,
			user.lastName,
			user.email,
			user.passwordHash,
			user.role,
			user.status,
			user.createdAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert user %s: %w", user.email, err)
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("Seeded %d sample users (password: password123)", len(sampleUsers))

	return nil
}

// Close closes the given database connection
func Close(db *sql.DB) error {
	if db != nil {
		return db.Close()
	}
	return nil
}
