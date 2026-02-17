package validation

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"net/mail"
	"strings"
	"time"
)

// ValidationError represents a field validation error
type ValidationError struct {
	Field   string
	Message string
}

// ValidationResult contains validation errors
type ValidationResult struct {
	Errors []ValidationError
}

// IsValid returns true if there are no validation errors
func (vr *ValidationResult) IsValid() bool {
	return len(vr.Errors) == 0
}

// AddError adds a validation error
func (vr *ValidationResult) AddError(field, message string) {
	vr.Errors = append(vr.Errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

// GetError returns the first error for a specific field
func (vr *ValidationResult) GetError(field string) string {
	for _, err := range vr.Errors {
		if err.Field == field {
			return err.Message
		}
	}
	return ""
}

// Validator provides validation methods
type Validator struct {
	result *ValidationResult
}

// New creates a new validator
func New() *Validator {
	return &Validator{
		result: &ValidationResult{
			Errors: []ValidationError{},
		},
	}
}

// Result returns the validation result
func (v *Validator) Result() *ValidationResult {
	return v.result
}

// Required checks if a field is not empty
func (v *Validator) Required(field, value, fieldName string) *Validator {
	if strings.TrimSpace(value) == "" {
		v.result.AddError(field, fmt.Sprintf("%s is required", fieldName))
	}
	return v
}

// Email validates email format
func (v *Validator) Email(field, value, fieldName string) *Validator {
	if value != "" {
		_, err := mail.ParseAddress(value)
		if err != nil {
			v.result.AddError(field, fmt.Sprintf("%s must be a valid email address", fieldName))
		}
	}
	return v
}

// MinLength checks minimum string length
func (v *Validator) MinLength(field, value string, min int, fieldName string) *Validator {
	if value != "" && len(value) < min {
		v.result.AddError(field, fmt.Sprintf("%s must be at least %d characters", fieldName, min))
	}
	return v
}

// MaxLength checks maximum string length
func (v *Validator) MaxLength(field, value string, max int, fieldName string) *Validator {
	if value != "" && len(value) > max {
		v.result.AddError(field, fmt.Sprintf("%s must not exceed %d characters", fieldName, max))
	}
	return v
}

// Phone validates phone number format (basic)
// Accepts: +1234567890, (123) 456-7890, 123-456-7890
func (v *Validator) Phone(field, value, fieldName string) *Validator {
	if value == "" {
		return v
	}

	digitCount := 0
	for _, r := range value {
		switch {
		case r >= '0' && r <= '9':
			digitCount++
		case r == '+' || r == '-' || r == '(' || r == ')' || r == ' ':
			// allowed non-digit characters
		default:
			v.result.AddError(field, fmt.Sprintf("%s must be a valid phone number", fieldName))
			return v
		}
	}

	if digitCount < 10 || digitCount > 15 {
		v.result.AddError(field, fmt.Sprintf("%s must be a valid phone number", fieldName))
	}

	return v
}

// DateBefore checks if date is before a given date
func (v *Validator) DateBefore(field, value string, before time.Time, fieldName string) *Validator {
	if value != "" {
		date, err := time.Parse("2006-01-02", value)
		if err != nil {
			v.result.AddError(field, fmt.Sprintf("%s must be a valid date", fieldName))
			return v
		}

		if !date.Before(before) {
			v.result.AddError(field, fmt.Sprintf("%s must be before %s", fieldName, before.Format("2006-01-02")))
		}
	}
	return v
}

// DateAfter checks if date is after a given date
func (v *Validator) DateAfter(field, value string, after time.Time, fieldName string) *Validator {
	if value != "" {
		date, err := time.Parse("2006-01-02", value)
		if err != nil {
			v.result.AddError(field, fmt.Sprintf("%s must be a valid date", fieldName))
			return v
		}

		if !date.After(after) {
			v.result.AddError(field, fmt.Sprintf("%s must be after %s", fieldName, after.Format("2006-01-02")))
		}
	}
	return v
}

// OneOf checks if value is in a list of allowed values
func (v *Validator) OneOf(field, value string, allowed []string, fieldName string) *Validator {
	if value != "" {
		found := false
		for _, a := range allowed {
			if value == a {
				found = true
				break
			}
		}

		if !found {
			v.result.AddError(field, fmt.Sprintf("%s must be one of: %s", fieldName, strings.Join(allowed, ", ")))
		}
	}
	return v
}

// FileSize validates file size
func (v *Validator) FileSize(field string, file *multipart.FileHeader, maxSizeBytes int64, fieldName string) *Validator {
	if file != nil {
		if file.Size > maxSizeBytes {
			maxMB := float64(maxSizeBytes) / (1024 * 1024)
			v.result.AddError(field, fmt.Sprintf("%s must not exceed %.2f MB", fieldName, maxMB))
		}
	}
	return v
}

// extMIMETypes maps file extensions to their expected MIME type prefixes.
var extMIMETypes = map[string][]string{
	".jpg":  {"image/jpeg"},
	".jpeg": {"image/jpeg"},
	".png":  {"image/png"},
	".pdf":  {"application/pdf"},
	".doc":  {"application/msword"},
	".docx": {"application/vnd.openxmlformats", "application/zip"},
}

// FileType validates file extension and content MIME type.
// It checks the extension first, then reads the file header bytes
// to verify the actual content matches the expected MIME type.
func (v *Validator) FileType(field string, file *multipart.FileHeader, allowed []string, fieldName string) *Validator {
	if file == nil {
		return v
	}

	// Check extension
	filename := strings.ToLower(file.Filename)
	matchedExt := ""
	for _, ext := range allowed {
		if strings.HasSuffix(filename, strings.ToLower(ext)) {
			matchedExt = strings.ToLower(ext)
			break
		}
	}

	if matchedExt == "" {
		v.result.AddError(field, fmt.Sprintf("%s must be one of: %s", fieldName, strings.Join(allowed, ", ")))
		return v
	}

	// Detect MIME type from file content
	f, err := file.Open()
	if err != nil {
		v.result.AddError(field, fmt.Sprintf("%s could not be read", fieldName))
		return v
	}
	defer f.Close()

	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	detected := http.DetectContentType(buf[:n])

	// Verify detected MIME matches expected types for the extension
	if expected, ok := extMIMETypes[matchedExt]; ok {
		valid := false
		for _, prefix := range expected {
			if strings.HasPrefix(detected, prefix) {
				valid = true
				break
			}
		}
		if !valid {
			v.result.AddError(field, fmt.Sprintf("%s content does not match its extension", fieldName))
		}
	}

	return v
}

// Sanitize removes potentially dangerous characters
func Sanitize(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")

	// Trim whitespace
	input = strings.TrimSpace(input)

	return input
}

// SanitizeHTML removes HTML tags (basic XSS prevention)
func SanitizeHTML(input string) string {
	var b strings.Builder
	b.Grow(len(input))
	inTag := false
	for _, r := range input {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			b.WriteRune(r)
		}
	}
	return b.String()
}
