package models

import (
	"database/sql"
	"fmt"
	"time"
)

// LoginAttempt represents a login attempt for audit and lockout purposes
type LoginAttempt struct {
	ID          int
	Email       string
	IPAddress   string
	UserAgent   string
	Success     bool
	AttemptedAt time.Time
}

// LoginAttemptDatabase provides database operations for login attempts
type LoginAttemptDatabase struct {
	db *sql.DB
}

// NewLoginAttemptDatabase creates a new LoginAttemptDatabase
func NewLoginAttemptDatabase(db *sql.DB) *LoginAttemptDatabase {
	return &LoginAttemptDatabase{db: db}
}

// Record inserts a login attempt
func (db *LoginAttemptDatabase) Record(attempt *LoginAttempt) error {
	successInt := 0
	if attempt.Success {
		successInt = 1
	}
	_, err := db.db.Exec(`
		INSERT INTO login_attempts (email, ip_address, user_agent, success)
		VALUES (?, ?, ?, ?)
	`, attempt.Email, attempt.IPAddress, attempt.UserAgent, successInt)
	if err != nil {
		return fmt.Errorf("failed to record login attempt: %w", err)
	}
	return nil
}

// CountRecentFailures counts failed login attempts for an email within a time window
func (db *LoginAttemptDatabase) CountRecentFailures(email string, window time.Duration) (int, error) {
	var count int
	cutoff := time.Now().Add(-window).UTC().Format("2006-01-02 15:04:05")
	err := db.db.QueryRow(`
		SELECT COUNT(*) FROM login_attempts
		WHERE email = ? AND success = 0 AND attempted_at > ?
	`, email, cutoff).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count recent failures: %w", err)
	}
	return count, nil
}

// CountRecentFailuresByIP counts failed login attempts from an IP within a time window
func (db *LoginAttemptDatabase) CountRecentFailuresByIP(ip string, window time.Duration) (int, error) {
	var count int
	cutoff := time.Now().Add(-window).UTC().Format("2006-01-02 15:04:05")
	err := db.db.QueryRow(`
		SELECT COUNT(*) FROM login_attempts
		WHERE ip_address = ? AND success = 0 AND attempted_at > ?
	`, ip, cutoff).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count recent failures by IP: %w", err)
	}
	return count, nil
}
