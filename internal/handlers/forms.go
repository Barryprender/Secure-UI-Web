package handlers

import (
	"html/template"
	"log"
	"net/http"
	"time"

	"secure-ui-showcase-go/internal/middleware"
	"secure-ui-showcase-go/internal/validation"
)

// FormSubmission represents the complete form data
type FormSubmission struct {
	// Text fields
	Bio      string `json:"bio"`
	Comments string `json:"comments"`

	// Select fields
	Country   string   `json:"country"`
	Role      string   `json:"role"`
	Interests []string `json:"interests"`

	// Date/Time fields
	BirthDate       string `json:"birth_date"`
	AppointmentTime string `json:"appointment_time"`
	PreferredTime   string `json:"preferred_time"`
	StartMonth      string `json:"start_month"`

	// Additional fields
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"-"` // Never include password in JSON responses

	// Files are handled separately via multipart form
}

// ValidateFormSubmission validates all form fields server-side
func (h *Handlers) ValidateFormSubmission(data *FormSubmission) *validation.ValidationResult {
	v := validation.New()

	// Required text fields
	v.Required("bio", data.Bio, "Biography").
		MaxLength("bio", data.Bio, 500, "Biography")

	v.MaxLength("comments", data.Comments, 1000, "Comments")

	// Required select fields - validate country against dynamic list from API
	validCountryCodes := h.CountryService.GetValidCodes()
	v.Required("country", data.Country, "Country").
		OneOf("country", data.Country, validCountryCodes, "Country")

	v.Required("role", data.Role, "Role").
		OneOf("role", data.Role, []string{"admin", "user", "guest"}, "Role")

	// Date validations
	if data.BirthDate != "" {
		maxDate := time.Date(2010, 1, 1, 0, 0, 0, 0, time.UTC)
		v.DateBefore("birth_date", data.BirthDate, maxDate, "Date of Birth")
	} else {
		v.Required("birth_date", data.BirthDate, "Date of Birth")
	}

	// Email validation
	v.Required("email", data.Email, "Email").
		Email("email", data.Email, "Email")

	// Phone validation
	v.Required("phone", data.Phone, "Phone").
		Phone("phone", data.Phone, "Phone")

	// Password validation
	v.Required("password", data.Password, "Password").
		MinLength("password", data.Password, 8, "Password")

	return v.Result()
}

// SubmitFormHandler handles form submission with server-side validation
func (h *Handlers) SubmitFormHandler(w http.ResponseWriter, r *http.Request) {
	// Parse form data
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	// Extract form values
	submission := &FormSubmission{
		Bio:             validation.Sanitize(r.FormValue("bio")),
		Comments:        validation.Sanitize(r.FormValue("comments")),
		Country:         validation.Sanitize(r.FormValue("country")),
		Role:            validation.Sanitize(r.FormValue("role")),
		BirthDate:       validation.Sanitize(r.FormValue("birth_date")),
		AppointmentTime: validation.Sanitize(r.FormValue("appointment_time")),
		PreferredTime:   validation.Sanitize(r.FormValue("preferred_time")),
		StartMonth:      validation.Sanitize(r.FormValue("start_month")),
		Email:           validation.Sanitize(r.FormValue("email")),
		Phone:           validation.Sanitize(r.FormValue("phone")),
		Password:        r.FormValue("password"), // Don't sanitize passwords
	}

	// Handle multiple select (interests)
	if interests, ok := r.Form["interests"]; ok {
		for _, interest := range interests {
			submission.Interests = append(submission.Interests, validation.Sanitize(interest))
		}
	}

	// Validate form data
	validationResult := h.ValidateFormSubmission(submission)

	// Handle file uploads if present
	if file, header, err := r.FormFile("profile_picture"); err == nil {
		defer file.Close()

		// Validate file
		v := validation.New()
		v.FileSize("profile_picture", header, 2*1024*1024, "Profile Picture"). // 2MB
											FileType("profile_picture", header, []string{".jpg", ".jpeg", ".png"}, "Profile Picture")

		if !v.Result().IsValid() {
			for _, err := range v.Result().Errors {
				validationResult.AddError(err.Field, err.Message)
			}
		}

		log.Printf("Received profile picture: %s (%d bytes)", header.Filename, header.Size)
	}

	// Handle multiple file uploads (documents)
	if files := r.MultipartForm.File["documents"]; len(files) > 0 {
		for _, header := range files {
			v := validation.New()
			v.FileSize("documents", header, 5*1024*1024, "Documents"). // 5MB
										FileType("documents", header, []string{".pdf", ".doc", ".docx"}, "Documents")

			if !v.Result().IsValid() {
				for _, err := range v.Result().Errors {
					validationResult.AddError(err.Field, err.Message)
				}
			}

			log.Printf("Received document: %s (%d bytes)", header.Filename, header.Size)
		}
	}

	// Check if client wants JSON response
	wantsJSON := r.Header.Get("Accept") == "application/json" ||
		r.Header.Get("Content-Type") == "application/json"

	// If validation fails, return errors
	if !validationResult.IsValid() {
		if wantsJSON {
			writeValidationErrors(w, validationResult.Errors)
			return
		}

		// For HTML form submission, render error page
		renderErrorPage(w, r, "Validation Errors", validationResult.Errors, "/forms")
		return
	}

	// Process the form (save to database, send emails, etc.)
	log.Printf("Form submitted successfully: email=%s, country=%s, role=%s", submission.Email, submission.Country, submission.Role)

	// Return success response
	if wantsJSON {
		writeSuccess(w, http.StatusOK, "Form submitted successfully", submission)
		return
	}

	// For HTML form submission, show success page
	renderSuccessPage(w, r, "Form Submitted Successfully!", "Your data has been received and validated.", "/forms")
}

// successPageData holds template data for the success page
type successPageData struct {
	Title   string
	Message string
	BackURL string
	Nonce   string
}

var successPageTmpl = template.Must(template.New("success").Parse(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Success - Secure-UI</title>
    <link rel="stylesheet" href="/static/styles/secure-ui.css">
    <style nonce="{{.Nonce}}">
        .success-container {
            max-width: 600px;
            margin: 4rem auto;
            padding: 2rem;
            text-align: center;
            background: var(--secure-ui-color-bg-secondary);
            border-radius: 8px;
        }
        .success-icon { font-size: 4rem; margin-bottom: 1rem; }
        .success-message { font-size: 1.5rem; color: var(--secure-ui-color-success); margin-bottom: 1rem; }
        .back-link {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.75rem 1.5rem;
            background: var(--secure-ui-color-primary);
            color: white;
            text-decoration: none;
            border-radius: 4px;
        }
        .back-link:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">Success</div>
        <div class="success-message">{{.Title}}</div>
        <p>{{.Message}}</p>
        <a href="{{.BackURL}}" class="back-link">Go Back</a>
    </div>
</body>
</html>`))

// renderSuccessPage renders an HTML success page
func renderSuccessPage(w http.ResponseWriter, r *http.Request, title, message, backURL string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	if err := successPageTmpl.Execute(w, successPageData{
		Title:   title,
		Message: message,
		BackURL: backURL,
		Nonce:   middleware.NonceFromContext(r.Context()),
	}); err != nil {
		log.Printf("failed to render success page: %v", err)
	}
}
