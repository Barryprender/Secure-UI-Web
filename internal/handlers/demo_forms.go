package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"secure-ui-showcase-go/internal/validation"
)

// DemoLoginHandler handles POST /api/demo/login.
func (h *Handlers) DemoLoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	email := validation.Sanitize(demoJSONString(body["email"]))
	password := demoJSONString(body["password"]) // passwords are not sanitized

	v := validation.New()
	v.Required("email", email, "Email").Email("email", email, "Email")
	v.Required("password", password, "Password").MinLength("password", password, 8, "Password")
	if result := v.Result(); !result.IsValid() {
		writeValidationErrors(w, result.Errors)
		return
	}

	log.Printf("demo login: email=%s", email)
	writeSuccess(w, http.StatusOK, "Login successful", map[string]any{
		"email":      email,
		"session_id": fmt.Sprintf("sess_%d", time.Now().UnixMilli()),
		"expires_in": 3600,
		"token_type": "Bearer",
	})
}

// DemoSubscribeHandler handles POST /api/demo/subscribe.
func (h *Handlers) DemoSubscribeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	name := validation.Sanitize(demoJSONString(body["name"]))
	email := validation.Sanitize(demoJSONString(body["email"]))
	plan := validation.Sanitize(demoJSONString(body["plan"]))

	v := validation.New()
	v.Required("name", name, "Name").MaxLength("name", name, 100, "Name").NoHTML("name", name, "Name")
	v.Required("email", email, "Email").Email("email", email, "Email")
	v.Required("plan", plan, "Plan").OneOf("plan", plan, []string{"starter", "pro", "enterprise"}, "Plan")
	if result := v.Result(); !result.IsValid() {
		writeValidationErrors(w, result.Errors)
		return
	}

	log.Printf("demo subscribe: name=%s email=%s plan=%s", name, email, plan)
	writeSuccess(w, http.StatusOK, "Subscription created", map[string]any{
		"name":            name,
		"email":           email,
		"plan":            plan,
		"subscription_id": fmt.Sprintf("sub_%d", time.Now().UnixMilli()),
		"status":          "active",
		"trial_ends":      time.Now().AddDate(0, 0, 14).Format("2006-01-02"),
	})
}

// DemoPaymentHandler handles POST /api/demo/payment.
// Full PAN and CVC are never transmitted — the secure-card component is designed
// to pass raw card data only to a PCI-compliant payment SDK via getCardData().
// Only last4 and card_type (safe identifiers) are included in the payload.
func (h *Handlers) DemoPaymentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	cardholderName := validation.Sanitize(demoJSONString(body["cardholder_name"]))
	billingAddress := validation.Sanitize(demoJSONString(body["billing_address"]))
	billingCity := validation.Sanitize(demoJSONString(body["billing_city"]))
	billingPostcode := validation.Sanitize(demoJSONString(body["billing_postcode"]))
	cardLast4 := validation.Sanitize(demoJSONString(body["card_last4"]))
	cardType := validation.Sanitize(demoJSONString(body["card_type"]))

	v := validation.New()
	v.Required("cardholder_name", cardholderName, "Cardholder Name").MaxLength("cardholder_name", cardholderName, 100, "Cardholder Name").NoHTML("cardholder_name", cardholderName, "Cardholder Name")
	v.Required("billing_address", billingAddress, "Billing Address").MaxLength("billing_address", billingAddress, 200, "Billing Address").NoHTML("billing_address", billingAddress, "Billing Address")
	v.Required("billing_city", billingCity, "City").MaxLength("billing_city", billingCity, 100, "City").NoHTML("billing_city", billingCity, "City")
	v.Required("billing_postcode", billingPostcode, "Postcode")
	if result := v.Result(); !result.IsValid() {
		writeValidationErrors(w, result.Errors)
		return
	}

	log.Printf("demo payment: cardholder=%s card_type=%s last4=****%s", cardholderName, cardType, cardLast4)
	writeSuccess(w, http.StatusOK, "Payment authorised (demo)", map[string]any{
		"cardholder_name": cardholderName,
		"card_type":       cardType,
		"last4":           cardLast4,
		"billing_city":    billingCity,
		"transaction_id":  fmt.Sprintf("txn_%d", time.Now().UnixMilli()),
		"status":          "authorised",
		"amount":          "0.00",
		"currency":        "GBP",
		"note":            "Full PAN never received — tokenise via payment SDK in production",
	})
}

// DemoComponentSubmitHandler handles POST /api/demo/component-submit.
// Used by all component showcase pages as a generic form submission target.
// Accepts any JSON body (the format secure-form sends), returns a success response.
func (h *Handlers) DemoComponentSubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeSuccess(w, http.StatusOK, "Form submitted successfully", nil)
}

// GetDemoCSRFToken issues a fresh CSRF token for re-use after a demo form submission.
// The CSRF store uses ConsumeToken (single-use), so the demo forms need to refresh
// their token after each successful submission.
// GET /api/demo/csrf-token
func (h *Handlers) GetDemoCSRFToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	token, err := h.generateCSRFToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	writeSuccess(w, http.StatusOK, "", map[string]any{"token": token})
}

// demoJSONString safely unmarshals a string field from a raw JSON value.
func demoJSONString(raw json.RawMessage) string {
	if raw == nil {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return ""
	}
	return s
}
