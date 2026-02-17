package services

import (
	"errors"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"

	"secure-ui-showcase-go/internal/models"
)

var (
	// ErrInvalidCredentials is returned for any login failure (generic to prevent enumeration)
	ErrInvalidCredentials = errors.New("invalid email or password")
	// ErrAccountLocked is returned when too many failed attempts have occurred
	ErrAccountLocked = errors.New("account temporarily locked")
	// ErrEmailExists is returned generically when registration fails due to duplicate email
	ErrEmailExists = errors.New("registration failed")
)

const (
	bcryptCost       = 12
	sessionDuration  = 24 * time.Hour
	lockoutThreshold = 5
	lockoutWindow    = 15 * time.Minute
)

// AuthService handles authentication, registration, and session management
type AuthService struct {
	UserDB         *models.UserDatabase
	SessionDB      *models.SessionDatabase
	LoginAttemptDB *models.LoginAttemptDatabase
}

// NewAuthService creates a new AuthService with the given dependencies
func NewAuthService(
	userDB *models.UserDatabase,
	sessionDB *models.SessionDatabase,
	loginAttemptDB *models.LoginAttemptDatabase,
) *AuthService {
	return &AuthService{
		UserDB:         userDB,
		SessionDB:      sessionDB,
		LoginAttemptDB: loginAttemptDB,
	}
}

// HashPassword creates a bcrypt hash from a plaintext password
func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword checks a plaintext password against a bcrypt hash
// bcrypt internally uses constant-time comparison
func (s *AuthService) VerifyPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// IsAccountLocked checks if an account has exceeded the failure threshold
func (s *AuthService) IsAccountLocked(email string) (bool, error) {
	count, err := s.LoginAttemptDB.CountRecentFailures(email, lockoutWindow)
	if err != nil {
		return false, err
	}
	return count >= lockoutThreshold, nil
}

// Login authenticates a user and creates a session
// Returns the session token on success
func (s *AuthService) Login(email, password, ip, userAgent string) (string, error) {
	// Check lockout BEFORE any credential check
	locked, err := s.IsAccountLocked(email)
	if err != nil {
		return "", fmt.Errorf("failed to check lockout: %w", err)
	}
	if locked {
		log.Printf("Locked account login attempt: email=%s ip=%s", email, ip)
		return "", ErrAccountLocked
	}

	// Look up user
	user, err := s.UserDB.GetByEmail(email)
	if err != nil {
		// User not found — run dummy bcrypt to prevent timing side-channel
		_ = bcrypt.CompareHashAndPassword(
			[]byte("$2a$12$000000000000000000000uGPuGDNMB5fXApYSKrhjYxLRmPCbInu"),
			[]byte(password),
		)
		s.recordFailedAttempt(email, ip, userAgent)
		return "", ErrInvalidCredentials
	}

	// Check that user has a password set
	if user.PasswordHash == "" {
		s.recordFailedAttempt(email, ip, userAgent)
		return "", ErrInvalidCredentials
	}

	// Verify password
	if !s.VerifyPassword(user.PasswordHash, password) {
		s.recordFailedAttempt(email, ip, userAgent)
		return "", ErrInvalidCredentials
	}

	// Check user status
	if user.Status != "active" {
		s.recordFailedAttempt(email, ip, userAgent)
		return "", ErrInvalidCredentials
	}

	// Record successful login
	_ = s.LoginAttemptDB.Record(&models.LoginAttempt{
		Email:     email,
		IPAddress: ip,
		UserAgent: userAgent,
		Success:   true,
	})

	// Generate session token
	token, err := models.GenerateSessionToken()
	if err != nil {
		return "", err
	}

	session := &models.Session{
		UserID:    user.ID,
		Token:     token,
		IPAddress: ip,
		UserAgent: userAgent,
		ExpiresAt: time.Now().Add(sessionDuration),
	}

	if err := s.SessionDB.Create(session); err != nil {
		return "", fmt.Errorf("failed to create session: %w", err)
	}

	log.Printf("User logged in: id=%d email=%s ip=%s", user.ID, email, ip)
	return token, nil
}

// recordFailedAttempt logs a failed login attempt
func (s *AuthService) recordFailedAttempt(email, ip, userAgent string) {
	if err := s.LoginAttemptDB.Record(&models.LoginAttempt{
		Email:     email,
		IPAddress: ip,
		UserAgent: userAgent,
		Success:   false,
	}); err != nil {
		log.Printf("Failed to record login attempt: %v", err)
	}
	log.Printf("Failed login attempt: email=%s ip=%s", email, ip)
}

// Logout deletes a session by token
func (s *AuthService) Logout(token string) error {
	return s.SessionDB.DeleteByToken(token)
}

// ValidateSession checks if a session token is valid and returns the associated user
// Returns nil, nil if the session is invalid or expired (not an error)
func (s *AuthService) ValidateSession(token string) (*models.User, error) {
	if token == "" {
		return nil, nil
	}

	session, err := s.SessionDB.GetByToken(token)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, nil
	}

	// Check expiry
	if time.Now().After(session.ExpiresAt) {
		_ = s.SessionDB.DeleteByToken(token)
		return nil, nil
	}

	user, err := s.UserDB.GetByID(session.UserID)
	if err != nil {
		// User deleted but session still exists; clean up
		_ = s.SessionDB.DeleteByToken(token)
		return nil, nil
	}

	return user, nil
}

// RegisterUser creates a new user account with a hashed password
func (s *AuthService) RegisterUser(firstName, lastName, email, password string) (*models.User, error) {
	// Check if email already exists
	existing, _ := s.UserDB.GetByEmail(email)
	if existing != nil {
		return nil, ErrEmailExists
	}

	hash, err := s.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		FirstName:    firstName,
		LastName:     lastName,
		Email:        email,
		PasswordHash: hash,
		Role:         "user",
		Status:       "active",
	}

	created, err := s.UserDB.CreateWithPassword(user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	log.Printf("User registered: id=%d email=%s", created.ID, email)
	return created, nil
}

// ChangePassword verifies the current password, updates to the new one,
// and invalidates all existing sessions for the user (force re-login).
// Returns the error if any step fails.
func (s *AuthService) ChangePassword(userID int, currentPassword, newPassword string) error {
	// Look up user
	user, err := s.UserDB.GetByID(userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// Verify current password
	if !s.VerifyPassword(user.PasswordHash, currentPassword) {
		return ErrInvalidCredentials
	}

	// Hash new password
	newHash, err := s.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password in database
	if err := s.UserDB.UpdatePasswordHash(userID, newHash); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Invalidate ALL sessions for this user (force re-login on all devices)
	if err := s.SessionDB.DeleteByUserID(userID); err != nil {
		log.Printf("Warning: failed to invalidate sessions after password change for user %d: %v", userID, err)
		// Don't return error — password was already changed successfully
	}

	log.Printf("Password changed for user id=%d, all sessions invalidated", userID)
	return nil
}

// CleanupExpiredSessions removes expired sessions from the database
// Intended to be called periodically by a background goroutine
func (s *AuthService) CleanupExpiredSessions() {
	count, err := s.SessionDB.DeleteExpired()
	if err != nil {
		log.Printf("Failed to cleanup expired sessions: %v", err)
		return
	}
	if count > 0 {
		log.Printf("Cleaned up %d expired sessions", count)
	}
}
