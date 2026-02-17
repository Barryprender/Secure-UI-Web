package models

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"time"
)

// Session represents an authenticated user session
type Session struct {
	ID        int
	UserID    int
	Token     string
	IPAddress string
	UserAgent string
	ExpiresAt time.Time
	CreatedAt time.Time
}

// SessionDatabase provides database operations for sessions
type SessionDatabase struct {
	db *sql.DB
}

// NewSessionDatabase creates a new SessionDatabase with the given sql.DB connection
func NewSessionDatabase(db *sql.DB) *SessionDatabase {
	return &SessionDatabase{db: db}
}

// GenerateSessionToken creates a cryptographically secure session token
// 32 bytes of entropy (256 bits) encoded as base64url
func GenerateSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate session token: %w", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// Create inserts a new session into the database
func (db *SessionDatabase) Create(session *Session) error {
	_, err := db.db.Exec(`
		INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
		VALUES (?, ?, ?, ?, ?)
	`, session.UserID, session.Token, session.IPAddress, session.UserAgent,
		session.ExpiresAt.UTC().Format("2006-01-02 15:04:05"))
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}
	return nil
}

// GetByToken retrieves a session by its token
// Returns nil, nil if not found (not an error condition)
func (db *SessionDatabase) GetByToken(token string) (*Session, error) {
	s := &Session{}
	var expiresAt, createdAt string

	err := db.db.QueryRow(`
		SELECT id, user_id, token, ip_address, user_agent, expires_at, created_at
		FROM sessions WHERE token = ?
	`, token).Scan(
		&s.ID, &s.UserID, &s.Token, &s.IPAddress,
		&s.UserAgent, &expiresAt, &createdAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	var parseErr error
	s.ExpiresAt, parseErr = parseTime(expiresAt)
	if parseErr != nil {
		return nil, fmt.Errorf("failed to parse expires_at: %w", parseErr)
	}
	s.CreatedAt, parseErr = parseTime(createdAt)
	if parseErr != nil {
		return nil, fmt.Errorf("failed to parse created_at: %w", parseErr)
	}

	return s, nil
}

// DeleteByToken removes a session by its token (logout)
func (db *SessionDatabase) DeleteByToken(token string) error {
	_, err := db.db.Exec("DELETE FROM sessions WHERE token = ?", token)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

// DeleteByUserID removes all sessions for a user (force logout all devices)
func (db *SessionDatabase) DeleteByUserID(userID int) error {
	_, err := db.db.Exec("DELETE FROM sessions WHERE user_id = ?", userID)
	if err != nil {
		return fmt.Errorf("failed to delete sessions for user %d: %w", userID, err)
	}
	return nil
}

// DeleteExpired removes all expired sessions and returns the count deleted
func (db *SessionDatabase) DeleteExpired() (int64, error) {
	result, err := db.db.Exec(
		"DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP")
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired sessions: %w", err)
	}
	return result.RowsAffected()
}
