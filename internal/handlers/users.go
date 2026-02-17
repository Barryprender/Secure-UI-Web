package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"secure-ui-showcase-go/internal/middleware"
	"secure-ui-showcase-go/internal/models"
	"secure-ui-showcase-go/internal/validation"
)

// UserRequest represents the request to create or update a user
type UserRequest struct {
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
}

// ValidateUserRequest validates user creation/update request
func ValidateUserRequest(req *UserRequest) *validation.ValidationResult {
	v := validation.New()

	v.Required("firstName", req.FirstName, "First Name").
		MaxLength("firstName", req.FirstName, 50, "First Name")

	v.Required("lastName", req.LastName, "Last Name").
		MaxLength("lastName", req.LastName, 50, "Last Name")

	v.Required("email", req.Email, "Email").
		Email("email", req.Email, "Email")

	v.Required("role", req.Role, "Role").
		OneOf("role", req.Role, []string{"admin", "moderator", "user"}, "Role")

	v.Required("status", req.Status, "Status").
		OneOf("status", req.Status, []string{"active", "inactive", "pending"}, "Status")

	return v.Result()
}

// GetUsers returns all users
func (h *Handlers) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.UserDB.GetAll()
	if err != nil {
		log.Printf("failed to get users: %v", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeSuccess(w, http.StatusOK, "", users)
}

// GetUser returns a single user by ID
func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := extractUserID(r.URL.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := h.UserDB.GetByID(id)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			writeError(w, http.StatusNotFound, "User not found")
			return
		}
		log.Printf("failed to get user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeSuccess(w, http.StatusOK, "", user)
}

// CreateUser creates a new user (requires authentication)
func (h *Handlers) CreateUser(w http.ResponseWriter, r *http.Request) {
	if requireAuth(w, r) == nil {
		return
	}

	// Limit request body to 1MB to prevent memory exhaustion
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req UserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Sanitize inputs
	req.FirstName = validation.Sanitize(req.FirstName)
	req.LastName = validation.Sanitize(req.LastName)
	req.Email = validation.Sanitize(req.Email)
	req.Role = validation.Sanitize(req.Role)
	req.Status = validation.Sanitize(req.Status)

	// Validate request
	validationResult := ValidateUserRequest(&req)
	if !validationResult.IsValid() {
		writeValidationErrors(w, validationResult.Errors)
		return
	}

	// Create user
	user := &models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Role:      req.Role,
		Status:    req.Status,
	}

	createdUser, err := h.UserDB.Create(user)
	if err != nil {
		log.Printf("failed to create user: %v", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	log.Printf("User created: %+v", createdUser)

	writeSuccess(w, http.StatusCreated, "User created successfully", createdUser)
}

// UpdateUser updates an existing user.
// Users can only update their own profile. Admins can update any user.
func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request) {
	caller := requireAuth(w, r)
	if caller == nil {
		return
	}

	id, err := extractUserID(r.URL.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Authorization: self-only unless admin
	if caller.Role != "admin" && caller.ID != id {
		writeError(w, http.StatusForbidden, "You can only edit your own profile")
		return
	}

	// Limit request body to 1MB to prevent memory exhaustion
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req UserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Sanitize inputs
	req.FirstName = validation.Sanitize(req.FirstName)
	req.LastName = validation.Sanitize(req.LastName)
	req.Email = validation.Sanitize(req.Email)
	req.Role = validation.Sanitize(req.Role)
	req.Status = validation.Sanitize(req.Status)

	// Non-admins cannot change their own role or status (prevent privilege escalation)
	if caller.Role != "admin" {
		req.Role = caller.Role
		req.Status = caller.Status
	}

	// Validate request
	validationResult := ValidateUserRequest(&req)
	if !validationResult.IsValid() {
		writeValidationErrors(w, validationResult.Errors)
		return
	}

	// Update user
	user := &models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Role:      req.Role,
		Status:    req.Status,
	}

	updatedUser, err := h.UserDB.Update(id, user)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			writeError(w, http.StatusNotFound, "User not found")
			return
		}
		log.Printf("failed to update user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	log.Printf("User updated: %+v", updatedUser)

	writeSuccess(w, http.StatusOK, "User updated successfully", updatedUser)
}

// DeleteUser deletes a user (admin only)
func (h *Handlers) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if requireAdmin(w, r) == nil {
		return
	}

	id, err := extractUserID(r.URL.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	err = h.UserDB.Delete(id)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			writeError(w, http.StatusNotFound, "User not found")
			return
		}
		log.Printf("failed to delete user %d: %v", id, err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	log.Printf("User deleted: ID=%d", id)

	writeSuccess(w, http.StatusOK, "User deleted successfully", nil)
}

// CreateUserFromForm handles HTML form submission to create a user
func (h *Handlers) CreateUserFromForm(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	// Extract and sanitize form values
	firstName := validation.Sanitize(r.FormValue("firstName"))
	lastName := validation.Sanitize(r.FormValue("lastName"))
	email := validation.Sanitize(r.FormValue("email"))

	// Create request object
	req := &UserRequest{
		FirstName: firstName,
		LastName:  lastName,
		Email:     email,
		Role:      "user",   // Default role for form submissions
		Status:    "active", // Default status for form submissions
	}

	// Validate request
	validationResult := ValidateUserRequest(req)
	if !validationResult.IsValid() {
		renderErrorPage(w, r, "Validation Errors", validationResult.Errors, "/dashboard")
		return
	}

	// Create user
	user := &models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Role:      req.Role,
		Status:    req.Status,
	}

	createdUser, err := h.UserDB.Create(user)
	if err != nil {
		log.Printf("failed to create user from form: %v", err)
		renderErrorPage(w, r, "Error", []validation.ValidationError{
			{Field: "general", Message: "Failed to create user. Please try again."},
		}, "/dashboard")
		return
	}

	log.Printf("User created from form: %+v", createdUser)

	// Redirect back to dashboard
	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// DeleteUserFromForm handles HTML form submission to delete a user (admin only)
func (h *Handlers) DeleteUserFromForm(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Admin-only: check the user from context (set by RequireAuth middleware on this route)
	caller := middleware.UserFromContext(r.Context())
	if caller == nil || caller.Role != "admin" {
		http.Error(w, "Admin access required", http.StatusForbidden)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	idStr := r.FormValue("id")
	if idStr == "" {
		http.Error(w, "Missing user ID", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	err = h.UserDB.Delete(id)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("failed to delete user %d: %v", id, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	log.Printf("User deleted from form: ID=%d", id)

	// Redirect back to the referring page, or table by default
	referer := r.Header.Get("Referer")
	if referer == "" {
		referer = "/table"
	}
	http.Redirect(w, r, referer, http.StatusSeeOther)
}
