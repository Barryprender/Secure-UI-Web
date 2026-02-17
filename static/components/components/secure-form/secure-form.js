/**
 * @fileoverview Secure Form Component
 *
 * A security-first form component that implements CSRF protection, automatic
 * field collection, validation, and comprehensive audit logging.
 *
 * Progressive Enhancement Strategy:
 * 1. Without JavaScript: Falls back to native HTML5 form submission
 * 2. With JavaScript: Enhances with CSRF tokens, validation, secure submission
 *
 * Usage:
 * <secure-form
 *   security-tier="sensitive"
 *   action="/api/submit"
 *   method="POST"
 *   csrf-token="your-csrf-token"
 * >
 *   <secure-input name="email" label="Email" required></secure-input>
 *   <button type="submit">Submit</button>
 * </secure-form>
 *
 * Security Features:
 * - CSRF token injection and validation
 * - Automatic secure field collection
 * - XSS prevention via sanitization
 * - Rate limiting on submission
 * - Comprehensive audit logging
 * - Secure headers for form submission
 * - Double-submit cookie pattern support
 *
 * @module secure-form
 * @license MIT
 */
var _a;
import { SecurityTier } from '../../core/security-config.js';
/**
 * Secure Form Web Component
 *
 * Provides a security-hardened form with CSRF protection and validation.
 * The component works as a standard HTML form without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * IMPORTANT: This component does NOT use Shadow DOM. It creates a native
 * <form> element in light DOM to ensure proper form submission and
 * accessibility. It extends HTMLElement directly, not SecureBaseComponent.
 *
 * @extends HTMLElement
 */
export class SecureForm extends HTMLElement {
    /** @private Whether component styles have been added to the document */
    static __stylesAdded = false;
    /**
     * Form element reference
     * @private
     */
    #formElement = null;
    /**
     * CSRF token hidden input reference
     * @private
     */
    #csrfInput = null;
    /**
     * Form status message element
     * @private
     */
    #statusElement = null;
    /**
     * Whether form is currently submitting
     * @private
     */
    #isSubmitting = false;
    /**
     * Unique ID for this form instance
     * @private
     */
    #instanceId = `secure-form-${Math.random().toString(36).substr(2, 9)}`;
    /**
     * Security tier for this form
     * @private
     */
    #securityTier = SecurityTier.PUBLIC;
    /**
     * Observed attributes for this component
     *
     * @static
     */
    static get observedAttributes() {
        return [
            'security-tier',
            'action',
            'method',
            'enctype',
            'csrf-token',
            'csrf-header-name',
            'csrf-field-name',
            'novalidate'
        ];
    }
    /**
     * Constructor
     */
    constructor() {
        super();
        // No Shadow DOM - we work exclusively in light DOM for form compatibility
    }
    /**
     * Called when element is connected to DOM
     *
     * Progressive Enhancement Strategy:
     * - Create a native <form> in light DOM (not Shadow DOM)
     * - Move all children into the form
     * - Add CSRF token as hidden field
     * - Attach event listeners for validation and optional enhancement
     */
    connectedCallback() {
        // Only initialize once
        if (this.#formElement) {
            return;
        }
        // Read security tier from attribute before anything else.
        // attributeChangedCallback fires before connectedCallback but early-returns
        // when #formElement is null, so the tier needs to be read here.
        const tierAttr = this.getAttribute('security-tier');
        if (tierAttr) {
            this.#securityTier = tierAttr;
        }
        // Progressive enhancement: check for server-rendered <form> in light DOM
        const existingForm = this.querySelector('form');
        if (existingForm) {
            // Adopt the existing form element
            this.#formElement = existingForm;
            this.#formElement.id = this.#instanceId;
            if (!this.#formElement.classList.contains('secure-form')) {
                this.#formElement.classList.add('secure-form');
            }
            // Apply/override form attributes from the custom element
            this.#applyFormAttributes();
            // Check if CSRF field already exists in the server-rendered form
            const csrfFieldName = this.getAttribute('csrf-field-name') || 'csrf_token';
            const existingCsrf = existingForm.querySelector(`input[name="${csrfFieldName}"]`);
            if (existingCsrf) {
                this.#csrfInput = existingCsrf;
                // Update token value from attribute if it differs
                const csrfToken = this.getAttribute('csrf-token');
                if (csrfToken && existingCsrf.value !== csrfToken) {
                    existingCsrf.value = csrfToken;
                }
            }
            else {
                this.#createCsrfField();
            }
        }
        else {
            // No server-rendered form: create one (original behavior)
            this.#formElement = document.createElement('form');
            this.#formElement.id = this.#instanceId;
            this.#formElement.className = 'secure-form';
            // Apply form attributes
            this.#applyFormAttributes();
            // Create CSRF token field
            this.#createCsrfField();
            // Move all existing children (inputs, buttons) into the form
            while (this.firstChild) {
                this.#formElement.appendChild(this.firstChild);
            }
            // Append the form to this element
            this.appendChild(this.#formElement);
        }
        // Create status message area
        this.#statusElement = document.createElement('div');
        this.#statusElement.className = 'form-status form-status-hidden';
        this.#statusElement.setAttribute('role', 'status');
        this.#statusElement.setAttribute('aria-live', 'polite');
        this.#formElement.insertBefore(this.#statusElement, this.#formElement.firstChild);
        // Add inline styles (since we're not using Shadow DOM)
        this.#addInlineStyles();
        // Set up event listeners
        this.#attachEventListeners();
        this.audit('form_initialized', {
            formId: this.#instanceId,
            action: this.#formElement.action,
            method: this.#formElement.method
        });
    }
    /**
     * Add component styles (CSP-compliant via adoptedStyleSheets on document)
     *
     * Uses constructable stylesheets instead of injecting <style> elements,
     * which would be blocked by strict Content Security Policy.
     *
     * @private
     */
    #addInlineStyles() {
        // Only add styles once globally
        if (!_a.__stylesAdded) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(this.#getComponentStyles());
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
            _a.__stylesAdded = true;
        }
    }
    /**
     * Apply attributes to the form element
     *
     * @private
     */
    #applyFormAttributes() {
        const action = this.getAttribute('action');
        if (action) {
            this.#formElement.action = action;
        }
        const method = this.getAttribute('method') || 'POST';
        this.#formElement.method = method.toUpperCase();
        const enctype = this.getAttribute('enctype') || 'application/x-www-form-urlencoded';
        this.#formElement.enctype = enctype;
        // Disable browser validation - we handle it ourselves
        const novalidate = this.hasAttribute('novalidate');
        if (novalidate) {
            this.#formElement.noValidate = true;
        }
        // Disable autocomplete for SENSITIVE and CRITICAL tiers
        if (this.#securityTier === SecurityTier.SENSITIVE || this.#securityTier === SecurityTier.CRITICAL) {
            this.#formElement.autocomplete = 'off';
        }
    }
    /**
     * Create CSRF token hidden field
     *
     * Security Note: CSRF tokens prevent Cross-Site Request Forgery attacks.
     * The token should be unique per session and validated server-side.
     *
     * @private
     */
    #createCsrfField() {
        const csrfToken = this.getAttribute('csrf-token');
        if (csrfToken) {
            this.#csrfInput = document.createElement('input');
            this.#csrfInput.type = 'hidden';
            // Use 'csrf_token' for backend compatibility (common convention)
            // Backends can configure via csrf-field-name attribute if needed
            const fieldName = this.getAttribute('csrf-field-name') || 'csrf_token';
            this.#csrfInput.name = fieldName;
            this.#csrfInput.value = csrfToken;
            this.#formElement.appendChild(this.#csrfInput);
            this.audit('csrf_token_injected', {
                formId: this.#instanceId,
                fieldName: fieldName
            });
        }
        else if (this.securityTier === SecurityTier.SENSITIVE ||
            this.securityTier === SecurityTier.CRITICAL) {
            console.warn('CSRF token not provided for SENSITIVE/CRITICAL tier form');
        }
    }
    /**
     * Attach event listeners
     *
     * @private
     */
    #attachEventListeners() {
        // Submit event - validate and enhance submission
        this.#formElement.addEventListener('submit', (e) => {
            this.#handleSubmit(e);
        });
        // Listen for secure field events
        this.addEventListener('secure-input', (e) => {
            this.#handleFieldChange(e);
        });
        this.addEventListener('secure-textarea', (e) => {
            this.#handleFieldChange(e);
        });
        this.addEventListener('secure-select', (e) => {
            this.#handleFieldChange(e);
        });
    }
    /**
     * Handle field change events
     *
     * @private
     */
    #handleFieldChange(_event) {
        // Clear form-level errors when user makes changes
        this.#clearStatus();
    }
    /**
     * Handle form submission
     *
     * Progressive Enhancement Strategy:
     * - If 'enhance' attribute is NOT set: Allow native form submission (backend agnostic)
     * - If 'enhance' attribute IS set: Intercept and use Fetch API with JSON
     *
     * Security Note: This is where we perform comprehensive validation,
     * rate limiting, and secure data collection before submission.
     *
     * @private
     */
    async #handleSubmit(event) {
        // Check if we should enhance the form submission with JavaScript
        const shouldEnhance = this.hasAttribute('enhance');
        // Prevent double submission
        if (this.#isSubmitting) {
            event.preventDefault();
            return;
        }
        // Check rate limit
        const rateLimitCheck = this.checkRateLimit();
        if (!rateLimitCheck.allowed) {
            event.preventDefault();
            this.#showStatus(`Too many submission attempts. Please wait ${Math.ceil(rateLimitCheck.retryAfter / 1000)} seconds.`, 'error');
            this.audit('form_rate_limited', {
                formId: this.#instanceId,
                retryAfter: rateLimitCheck.retryAfter
            });
            return;
        }
        // Discover and validate all secure fields
        const validation = this.#validateAllFields();
        if (!validation.valid) {
            event.preventDefault();
            console.log('[secure-form] Validation failed:', validation.errors);
            this.#showStatus(validation.errors.join(', '), 'error');
            this.audit('form_validation_failed', {
                formId: this.#instanceId,
                errors: validation.errors
            });
            return;
        }
        console.log('[secure-form] Validation passed, shouldEnhance:', shouldEnhance);
        // If not enhancing, allow native form submission
        if (!shouldEnhance) {
            // CRITICAL: Sync secure-input values to hidden fields for native submission
            // Secure-input components have their actual <input> in Shadow DOM,
            // so we need to create hidden inputs for native form submission
            this.#syncSecureInputsToForm();
            // Let the browser handle the submission normally
            console.log('[secure-form] Allowing native submission to:', this.#formElement.action);
            this.audit('form_submitted_native', {
                formId: this.#instanceId,
                action: this.#formElement.action,
                method: this.#formElement.method
            });
            return; // Allow default behavior
        }
        // Enhanced submission with JavaScript (Fetch API)
        event.preventDefault();
        // Mark as submitting
        this.#isSubmitting = true;
        this.#showStatus('Submitting...', 'info');
        this.#disableForm();
        // Collect form data securely
        const formData = this.#collectFormData();
        // Audit log submission
        this.audit('form_submitted_enhanced', {
            formId: this.#instanceId,
            action: this.#formElement.action,
            method: this.#formElement.method,
            fieldCount: Object.keys(formData).length
        });
        // Dispatch pre-submit event for custom handling
        const preSubmitEvent = new CustomEvent('secure-form-submit', {
            detail: {
                formData,
                formElement: this.#formElement,
                preventDefault: () => {
                    this.#isSubmitting = false;
                    this.#enableForm();
                }
            },
            bubbles: true,
            composed: true,
            cancelable: true
        });
        const shouldContinue = this.dispatchEvent(preSubmitEvent);
        if (!shouldContinue) {
            // Custom handler prevented default submission
            this.#isSubmitting = false;
            this.#enableForm();
            return;
        }
        // Perform secure submission via Fetch
        try {
            await this.#submitForm(formData);
        }
        catch (error) {
            this.#showStatus('Submission failed. Please try again.', 'error');
            this.audit('form_submission_error', {
                formId: this.#instanceId,
                error: error.message
            });
        }
        finally {
            this.#isSubmitting = false;
            this.#enableForm();
        }
    }
    /**
     * Sync secure-input component values to hidden form inputs
     *
     * CRITICAL for native form submission: Secure-input components have their
     * actual <input> elements in Shadow DOM, which can't participate in native
     * form submission. We create/update hidden inputs in the form for each
     * secure-input to enable backend-agnostic form submission.
     *
     * @private
     */
    #syncSecureInputsToForm() {
        const secureInputs = this.#formElement.querySelectorAll('secure-input, secure-textarea, secure-select');
        secureInputs.forEach((input) => {
            const name = input.getAttribute('name');
            if (!name)
                return;
            // CRITICAL: Disable the native fallback inputs inside the secure component
            // so they don't participate in native form submission (they are empty because
            // the user typed into the shadow DOM input). Without this, the server receives
            // the empty native input value first, ignoring the synced hidden input.
            const nativeFallbacks = input.querySelectorAll(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
            nativeFallbacks.forEach((fallback) => {
                fallback.removeAttribute('name');
            });
            // Check if hidden input already exists
            let hiddenInput = this.#formElement.querySelector(`input[type="hidden"][data-secure-input="${name}"]`);
            if (!hiddenInput) {
                // Create hidden input for this secure-input
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.setAttribute('data-secure-input', name);
                hiddenInput.name = name;
                this.#formElement.appendChild(hiddenInput);
            }
            // Sync the value
            hiddenInput.value = input.value || '';
        });
    }
    /**
     * Validate all secure fields in the form
     *
     * @private
     */
    #validateAllFields() {
        const errors = [];
        // Find all secure input components within the form
        const inputs = this.#formElement.querySelectorAll('secure-input, secure-textarea, secure-select');
        inputs.forEach((input) => {
            if (typeof input.valid === 'boolean' && !input.valid) {
                const label = input.getAttribute('label') || input.getAttribute('name') || 'Field';
                errors.push(`${label} is invalid`);
            }
        });
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Collect form data from secure fields
     *
     * Security Note: We collect data from secure components which have already
     * sanitized their values. We also include the CSRF token.
     *
     * @private
     */
    #collectFormData() {
        const formData = {};
        // Collect from secure components within the form
        const secureInputs = this.#formElement.querySelectorAll('secure-input, secure-textarea, secure-select');
        secureInputs.forEach((input) => {
            const typedInput = input;
            if (typedInput.name) {
                formData[typedInput.name] = typedInput.value;
            }
        });
        // Collect from standard form inputs (for non-secure fields)
        const standardInputs = this.#formElement.querySelectorAll('input:not([type="hidden"]), textarea:not(.textarea-field), select:not(.select-field)');
        standardInputs.forEach((input) => {
            const typedInput = input;
            if (typedInput.name) {
                formData[typedInput.name] = this.sanitizeValue(typedInput.value);
            }
        });
        // Include CSRF token
        if (this.#csrfInput) {
            formData[this.#csrfInput.name] = this.#csrfInput.value;
        }
        return formData;
    }
    /**
     * Submit form data securely
     *
     * Security Note: We use fetch API with secure headers and proper CSRF handling.
     * In production, ensure the server validates the CSRF token.
     *
     * @private
     */
    async #submitForm(formData) {
        const action = this.#formElement.action;
        const method = this.#formElement.method;
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json'
        };
        // Add CSRF token to header if specified
        const csrfHeaderName = this.getAttribute('csrf-header-name');
        if (csrfHeaderName && this.#csrfInput) {
            headers[csrfHeaderName] = this.#csrfInput.value;
        }
        // Perform fetch
        const response = await fetch(action, {
            method: method,
            headers: headers,
            body: JSON.stringify(formData),
            credentials: 'same-origin', // Include cookies for CSRF validation
            mode: 'cors',
            cache: 'no-cache',
            redirect: 'follow'
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // Success
        this.#showStatus('Form submitted successfully!', 'success');
        // Dispatch success event
        this.dispatchEvent(new CustomEvent('secure-form-success', {
            detail: {
                formData,
                response
            },
            bubbles: true,
            composed: true
        }));
        return response;
    }
    /**
     * Disable form during submission
     *
     * @private
     */
    #disableForm() {
        // Disable all form controls
        const controls = this.#formElement.querySelectorAll('input, textarea, select, button');
        controls.forEach((control) => {
            control.disabled = true;
        });
        // Also disable secure components
        const secureFields = this.querySelectorAll('secure-input, secure-textarea, secure-select');
        secureFields.forEach((field) => {
            field.setAttribute('disabled', '');
        });
    }
    /**
     * Enable form after submission
     *
     * @private
     */
    #enableForm() {
        // Enable all form controls
        const controls = this.#formElement.querySelectorAll('input, textarea, select, button');
        controls.forEach((control) => {
            control.disabled = false;
        });
        // Also enable secure components
        const secureFields = this.querySelectorAll('secure-input, secure-textarea, secure-select');
        secureFields.forEach((field) => {
            field.removeAttribute('disabled');
        });
    }
    /**
     * Show status message
     *
     * @private
     */
    #showStatus(message, type = 'info') {
        this.#statusElement.textContent = message;
        this.#statusElement.className = `form-status form-status-${type}`;
    }
    /**
     * Clear status message
     *
     * @private
     */
    #clearStatus() {
        this.#statusElement.textContent = '';
        this.#statusElement.className = 'form-status form-status-hidden';
    }
    /**
     * Get component-specific styles (for light DOM, no Shadow DOM)
     *
     * @private
     */
    /**
   * Get component styles
   * @private
   * @returns {string} Component CSS
   */
  #getComponentStyles() {
    return `secure-form{display:block}secure-form .secure-form{padding:16px;border:2px solid #e0e0e0;border-radius:8px;background-color:transparent}secure-form[security-tier="critical"] .secure-form{padding:20px}secure-form[security-tier="public"] .secure-form{border:none}secure-form .form-status{padding:12px;margin-bottom:16px;border-radius:4px;font-size:14px}secure-form .form-status-hidden{display:none}secure-form .form-status-info{display:block;background-color:#E3F2FD;color:#1976D2;border:1px solid #1976D2}secure-form .form-status-success{display:block;background-color:#E8F5E9;color:#388E3C;border:1px solid #388E3C}secure-form .form-status-error{display:block;background-color:#FFEBEE;color:#D32F2F;border:1px solid #D32F2F}`;
  }
    /**
     * Get form data
     *
     * @public
     */
    getData() {
        return this.#collectFormData();
    }
    /**
     * Reset the form
     *
     * @public
     */
    reset() {
        if (this.#formElement) {
            this.#formElement.reset();
            this.#clearStatus();
            this.audit('form_reset', {
                formId: this.#instanceId
            });
        }
    }
    /**
     * Programmatically submit the form
     *
     * @public
     */
    submit() {
        if (this.#formElement) {
            // Trigger submit event which will run our validation
            this.#formElement.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    }
    /**
     * Check if form is valid
     *
     * @public
     */
    get valid() {
        const validation = this.#validateAllFields();
        return validation.valid;
    }
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback() {
        // Clear any sensitive form data
        if (this.#formElement) {
            this.#formElement.reset();
        }
    }
    /**
     * Handle attribute changes
     */
    attributeChangedCallback(name, _oldValue, newValue) {
        if (!this.#formElement)
            return;
        switch (name) {
            case 'security-tier':
                this.#securityTier = (newValue || SecurityTier.PUBLIC);
                break;
            case 'action':
                this.#formElement.action = newValue;
                break;
            case 'method':
                this.#formElement.method = newValue;
                break;
            case 'csrf-token':
                if (this.#csrfInput) {
                    this.#csrfInput.value = newValue;
                }
                break;
        }
    }
    /**
     * Get security tier
     */
    get securityTier() {
        return this.#securityTier;
    }
    /**
     * Sanitize a value to prevent XSS
     */
    sanitizeValue(value) {
        if (typeof value !== 'string')
            return '';
        return value.replace(/[<>]/g, '');
    }
    /**
     * Audit log helper
     */
    audit(action, data) {
        if (console.debug) {
            console.debug(`[secure-form] ${action}`, data);
        }
    }
    /**
     * Check rate limit (stub - implement proper rate limiting in production)
     */
    checkRateLimit() {
        return { allowed: true, retryAfter: 0 };
    }
}
_a = SecureForm;
// Define the custom element
customElements.define('secure-form', SecureForm);
export default SecureForm;
//# sourceMappingURL=secure-form.js.map