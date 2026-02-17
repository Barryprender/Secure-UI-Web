package models

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// ErrNotFound is returned when a user is not found
var ErrNotFound = errors.New("user not found")

// timeFormats lists the possible timestamp formats from SQLite
var timeFormats = []string{
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05Z",
	"2006-01-02T15:04:05",
	"2006-01-02 15:04:05.000",
	"2006-01-02T15:04:05.000Z",
	time.RFC3339,
	time.RFC3339Nano,
}

// parseTime attempts to parse a timestamp string using multiple formats
func parseTime(value string) (time.Time, error) {
	for _, format := range timeFormats {
		if t, err := time.Parse(format, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time: %s", value)
}

// User represents a user in the system
type User struct {
	ID           int       `json:"id"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // never serialize to JSON
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
}

// UserDatabase provides database operations for users
type UserDatabase struct {
	db *sql.DB
}

// NewUserDatabase creates a new UserDatabase with the given sql.DB connection
func NewUserDatabase(db *sql.DB) *UserDatabase {
	return &UserDatabase{db: db}
}

// GetAll returns all users
func (db *UserDatabase) GetAll() ([]*User, error) {
	rows, err := db.db.Query(`
		SELECT id, first_name, last_name, email, password_hash, role, status, created_at
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	users := []*User{}
	for rows.Next() {
		user := &User{}
		var createdAt string
		err := rows.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&createdAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}

		// Parse timestamp
		parsedTime, err := parseTime(createdAt)
		if err != nil {
			return nil, fmt.Errorf("failed to parse created_at for user %d: %w", user.ID, err)
		}
		user.CreatedAt = parsedTime
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return users, nil
}

// GetByID returns a user by ID
// Returns ErrNotFound if the user does not exist
func (db *UserDatabase) GetByID(id int) (*User, error) {
	user := &User{}
	var createdAt string

	err := db.db.QueryRow(`
		SELECT id, first_name, last_name, email, password_hash, role, status, created_at
		FROM users
		WHERE id = ?
	`, id).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.Status,
		&createdAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID %d: %w", id, err)
	}

	// Parse timestamp
	parsedTime, err := parseTime(createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse created_at for user %d: %w", id, err)
	}
	user.CreatedAt = parsedTime

	return user, nil
}

// GetByEmail returns a user by email address
// Returns ErrNotFound if the user does not exist
func (db *UserDatabase) GetByEmail(email string) (*User, error) {
	user := &User{}
	var createdAt string

	err := db.db.QueryRow(`
		SELECT id, first_name, last_name, email, password_hash, role, status, created_at
		FROM users
		WHERE email = ?
	`, email).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.Status,
		&createdAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	parsedTime, err := parseTime(createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse created_at: %w", err)
	}
	user.CreatedAt = parsedTime

	return user, nil
}

// Create creates a new user (without password — for backward compat with existing CRUD)
func (db *UserDatabase) Create(user *User) (*User, error) {
	result, err := db.db.Exec(`
		INSERT INTO users (first_name, last_name, email, role, status, created_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, user.FirstName, user.LastName, user.Email, user.Role, user.Status)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Get the inserted ID
	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	user.ID = int(id)
	user.CreatedAt = time.Now()

	return user, nil
}

// CreateWithPassword creates a new user with a bcrypt password hash
func (db *UserDatabase) CreateWithPassword(user *User) (*User, error) {
	result, err := db.db.Exec(`
		INSERT INTO users (first_name, last_name, email, password_hash, role, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, user.FirstName, user.LastName, user.Email, user.PasswordHash, user.Role, user.Status)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	user.ID = int(id)
	user.CreatedAt = time.Now()

	return user, nil
}

// Update updates an existing user
// Returns ErrNotFound if the user does not exist
func (db *UserDatabase) Update(id int, user *User) (*User, error) {
	// First check if user exists
	existing, err := db.GetByID(id)
	if err != nil {
		return nil, err // Propagates ErrNotFound or other errors
	}

	_, err = db.db.Exec(`
		UPDATE users
		SET first_name = ?, last_name = ?, email = ?, role = ?, status = ?
		WHERE id = ?
	`, user.FirstName, user.LastName, user.Email, user.Role, user.Status, id)

	if err != nil {
		return nil, fmt.Errorf("failed to update user %d: %w", id, err)
	}

	// Keep the original ID and CreatedAt
	user.ID = existing.ID
	user.CreatedAt = existing.CreatedAt

	return user, nil
}

// UpdatePasswordHash updates the password hash for a user
// Returns ErrNotFound if the user does not exist
func (db *UserDatabase) UpdatePasswordHash(id int, passwordHash string) error {
	result, err := db.db.Exec(
		"UPDATE users SET password_hash = ? WHERE id = ?",
		passwordHash, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update password for user %d: %w", id, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

// Delete deletes a user by ID
// Returns ErrNotFound if the user does not exist
func (db *UserDatabase) Delete(id int) error {
	result, err := db.db.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete user %d: %w", id, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}
