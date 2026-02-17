/**
 * @fileoverview Secure Submit Button Component
 *
 * A security-aware form submit button that integrates with <secure-form>.
 * The button's enabled/disabled state is driven by the parent form's security
 * tier and field validation state.
 *
 * Tier behaviour:
 * - public:        Button enabled by default (validation.required = false)
 * - authenticated: Button disabled until all required fields are valid
 * - sensitive:     Button disabled until all required fields are valid
 * - critical:      Button disabled until all required fields are valid
 *
 * Usage:
 * <secure-form action="/api/data" method="POST" security-tier="sensitive">
 *   <secure-input label="Name" name="name" required></secure-input>
 *   <secure-submit-button label="Submit"></secure-submit-button>
 * </secure-form>
 *
 * @module secure-submit-button
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
import { getTierConfig } from '../../core/security-config.js';
/**
 * Secure Submit Button Web Component
 *
 * Provides a security-aware submit button that monitors parent form validity
 * and enables/disables based on the form's security tier requirements.
 *
 * @extends SecureBaseComponent
 */
export class SecureSubmitButton extends SecureBaseComponent {
    /**
     * Button element reference inside shadow DOM
     * @private
     */
    #buttonElement = null;
    /**
     * Label span element
     * @private
     */
    #labelElement = null;
    /**
     * Loading indicator element
     * @private
     */
    #loadingElement = null;
    /**
     * Reference to the parent <secure-form> element
     * @private
     */
    #parentForm = null;
    /**
     * Whether the parent form is currently valid
     * @private
     */
    #isFormValid = false;
    /**
     * Whether a submission is in progress
     * @private
     */
    #isSubmitting = false;
    /**
     * Effective security tier (inherited from form or explicit)
     * @private
     */
    #effectiveTier = 'critical';
    /**
     * Effective tier config
     * @private
     */
    #effectiveConfig;
    /**
     * Bound event handler for field change events
     * @private
     */
    #boundHandleFieldChange;
    /**
     * Bound click handler
     * @private
     */
    #boundHandleClick;
    /**
     * Observed attributes
     */
    static get observedAttributes() {
        return [
            ...super.observedAttributes,
            'label',
            'loading-label',
            'disabled'
        ];
    }
    constructor() {
        super();
        this.#effectiveConfig = getTierConfig(this.#effectiveTier);
        this.#boundHandleFieldChange = this.#handleFieldChange.bind(this);
        this.#boundHandleClick = this.#handleClick.bind(this);
    }
    /**
     * Connected to DOM — discover form, attach listeners, evaluate state
     */
    connectedCallback() {
        super.connectedCallback();
        // Defer form discovery to ensure parent secure-form has initialized
        // (secure-form creates its <form> element in its own connectedCallback)
        queueMicrotask(() => {
            this.#discoverParentForm();
            this.#resolveEffectiveTier();
            this.#attachFormListeners();
            this.#evaluateValidity();
            this.audit('submit_button_initialized', {
                tier: this.#effectiveTier,
                hasParentForm: !!this.#parentForm
            });
        });
    }
    /**
     * Render the button inside shadow DOM
     */
    render() {
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');
        container.className = 'submit-container';
        // Create button (type="button" — cannot use type="submit" in shadow DOM)
        this.#buttonElement = document.createElement('button');
        this.#buttonElement.type = 'button';
        this.#buttonElement.className = 'submit-btn';
        this.#buttonElement.disabled = true; // Disabled by default until validity is evaluated
        this.#buttonElement.setAttribute('aria-disabled', 'true');
        // Label span
        this.#labelElement = document.createElement('span');
        this.#labelElement.className = 'btn-label';
        this.#labelElement.textContent = this.sanitizeValue(this.getAttribute('label') || 'Submit');
        // Loading indicator span (hidden by default)
        this.#loadingElement = document.createElement('span');
        this.#loadingElement.className = 'btn-loading hidden';
        this.#loadingElement.setAttribute('aria-hidden', 'true');
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        const loadingText = document.createElement('span');
        loadingText.textContent = this.sanitizeValue(this.getAttribute('loading-label') || 'Submitting...');
        this.#loadingElement.appendChild(spinner);
        this.#loadingElement.appendChild(loadingText);
        this.#buttonElement.appendChild(this.#labelElement);
        this.#buttonElement.appendChild(this.#loadingElement);
        // Click handler
        this.#buttonElement.addEventListener('click', this.#boundHandleClick);
        container.appendChild(this.#buttonElement);
        fragment.appendChild(container);
        this.addComponentStyles(this.#getComponentStyles());
        return fragment;
    }
    // ---------------------------------------------------------------------------
    // Form discovery & tier resolution
    // ---------------------------------------------------------------------------
    /**
     * Find the parent <secure-form> element
     * @private
     */
    #discoverParentForm() {
        this.#parentForm = this.closest('secure-form');
    }
    /**
     * Determine the effective security tier.
     * If the button has an explicit security-tier attribute, use it.
     * Otherwise, inherit from the parent form.
     * @private
     */
    #resolveEffectiveTier() {
        const ownTier = this.getAttribute('security-tier');
        if (!ownTier && this.#parentForm) {
            // Inherit from parent form
            this.#effectiveTier = this.#parentForm.securityTier;
        }
        else {
            this.#effectiveTier = this.securityTier;
        }
        this.#effectiveConfig = getTierConfig(this.#effectiveTier);
    }
    // ---------------------------------------------------------------------------
    // Validation monitoring
    // ---------------------------------------------------------------------------
    /**
     * Attach event listeners on the parent form to monitor field changes
     * @private
     */
    #attachFormListeners() {
        const target = this.#parentForm || this.parentElement;
        if (!target)
            return;
        target.addEventListener('secure-input', this.#boundHandleFieldChange);
        target.addEventListener('secure-textarea', this.#boundHandleFieldChange);
        target.addEventListener('secure-select', this.#boundHandleFieldChange);
        target.addEventListener('secure-datetime', this.#boundHandleFieldChange);
    }
    /**
     * Handle a field change event — re-evaluate form validity
     * @private
     */
    #handleFieldChange(_event) {
        this.#evaluateValidity();
    }
    /**
     * Evaluate form validity and enable/disable the button accordingly
     * @private
     */
    #evaluateValidity() {
        // If manually disabled via attribute, stay disabled
        if (this.hasAttribute('disabled')) {
            this.#setButtonDisabled(true);
            return;
        }
        // If currently submitting, stay disabled
        if (this.#isSubmitting) {
            return;
        }
        // Public tier: validation not required, button always enabled
        if (!this.#effectiveConfig.validation.required) {
            this.#isFormValid = true;
            this.#setButtonDisabled(false);
            return;
        }
        // Authenticated / Sensitive / Critical: check form validity
        if (this.#parentForm && typeof this.#parentForm.valid === 'boolean') {
            this.#isFormValid = this.#parentForm.valid;
        }
        else {
            // Fallback: manually query fields
            this.#isFormValid = this.#checkFieldsValid();
        }
        this.#setButtonDisabled(!this.#isFormValid);
    }
    /**
     * Fallback field validation when no parent form is found
     * @private
     */
    #checkFieldsValid() {
        const container = this.#parentForm || this.parentElement;
        if (!container)
            return false;
        const fields = container.querySelectorAll('secure-input, secure-textarea, secure-select, secure-datetime, secure-file-upload');
        for (const field of fields) {
            const typedField = field;
            if (typeof typedField.valid === 'boolean' && !typedField.valid) {
                return false;
            }
        }
        // If there are no fields and validation is required, stay disabled
        return fields.length > 0;
    }
    /**
     * Update the button's disabled state
     * @private
     */
    #setButtonDisabled(disabled) {
        if (!this.#buttonElement)
            return;
        this.#buttonElement.disabled = disabled;
        this.#buttonElement.setAttribute('aria-disabled', String(disabled));
    }
    // ---------------------------------------------------------------------------
    // Click & submission
    // ---------------------------------------------------------------------------
    /**
     * Handle button click — rate limit, audit, trigger form submission
     * @private
     */
    #handleClick() {
        if (this.#isSubmitting || this.#buttonElement?.disabled)
            return;
        // Rate limit check
        const rateLimitCheck = this.checkRateLimit();
        if (!rateLimitCheck.allowed) {
            this.audit('submit_button_rate_limited', {
                retryAfter: rateLimitCheck.retryAfter
            });
            return;
        }
        this.audit('submit_button_clicked', {
            tier: this.#effectiveTier,
            formValid: this.#isFormValid
        });
        // Show loading state
        this.#setLoading(true);
        // Trigger form submission via parent secure-form
        if (this.#parentForm) {
            this.#parentForm.submit();
        }
        this.#setLoading(false);
        // Loading state remains until explicitly reset via setLoading(false)
        // or the form's success/error response handler resets it.
    }
    /**
     * Toggle loading/submitting state
     * @private
     */
    #setLoading(loading) {
        this.#isSubmitting = loading;
        if (this.#buttonElement) {
            this.#buttonElement.disabled = loading;
            this.#buttonElement.setAttribute('aria-disabled', String(loading));
        }
        if (this.#labelElement) {
            this.#labelElement.classList.toggle('hidden', loading);
        }
        if (this.#loadingElement) {
            this.#loadingElement.classList.toggle('hidden', !loading);
            this.#loadingElement.setAttribute('aria-hidden', String(!loading));
        }
    }
    // ---------------------------------------------------------------------------
    // Attribute changes
    // ---------------------------------------------------------------------------
    handleAttributeChange(name, _oldValue, newValue) {
        switch (name) {
            case 'label':
                if (this.#labelElement) {
                    this.#labelElement.textContent = this.sanitizeValue(newValue || 'Submit');
                }
                break;
            case 'loading-label':
                if (this.#loadingElement) {
                    const textSpan = this.#loadingElement.querySelector('span:last-child');
                    if (textSpan) {
                        textSpan.textContent = this.sanitizeValue(newValue || 'Submitting...');
                    }
                }
                break;
            case 'disabled':
                this.#evaluateValidity();
                break;
        }
    }
    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
    /**
     * Whether the button is disabled
     */
    get disabled() {
        return this.#buttonElement ? this.#buttonElement.disabled : true;
    }
    set disabled(value) {
        if (value) {
            this.setAttribute('disabled', '');
        }
        else {
            this.removeAttribute('disabled');
        }
        this.#evaluateValidity();
    }
    /**
     * The button label text
     */
    get label() {
        return this.getAttribute('label') || 'Submit';
    }
    set label(value) {
        this.setAttribute('label', value);
    }
    // ---------------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------------
    /**
   * Get component styles
   * @private
   * @returns {string} Component CSS
   */
  #getComponentStyles() {
    return `:host{display:inline-block}.submit-container{margin-top:8px;position:relative}.submit-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 24px;min-height:40px;font-family:inherit;font-size:14px;font-weight:600;line-height:1;border-radius:4px;border:2px solid transparent;cursor:pointer;transition:background-color 0.2s ease-out,border-color 0.2s ease-out,opacity 0.2s ease-out,box-shadow 0.2s ease-out,color 0.2s ease-out,transform 0.15s ease-out;background-color:#3b82f6;color:#ffffff;user-select:none}.submit-btn:hover:not(:disabled){background-color:#2563eb;transform:translateY(-1px);box-shadow:0 2px 8px rgba(59,130,246,0.25)}.submit-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(59,130,246,0.3)}.submit-btn:active:not(:disabled){background-color:#1d4ed8;transform:scale(0.98);box-shadow:none}.submit-btn:disabled{background-color:#d1d5db;color:#9ca3af;border-color:#e5e7eb;cursor:not-allowed;opacity:0.7;transform:none;box-shadow:none}.btn-label,.btn-loading{display:inline-flex;align-items:center;gap:8px;transition:opacity 0.2s ease-out}.btn-label.hidden,.btn-loading.hidden{display:none}.spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.submit-btn{transition:none !important}.btn-label,.btn-loading{transition:none !important}.spinner{animation:none;border-right-color:currentColor;opacity:0.5}}`;
  }
    // ---------------------------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------------------------
    disconnectedCallback() {
        super.disconnectedCallback();
        const target = this.#parentForm || this.parentElement;
        if (target) {
            target.removeEventListener('secure-input', this.#boundHandleFieldChange);
            target.removeEventListener('secure-textarea', this.#boundHandleFieldChange);
            target.removeEventListener('secure-select', this.#boundHandleFieldChange);
            target.removeEventListener('secure-datetime', this.#boundHandleFieldChange);
        }
    }
}
// Register the custom element
customElements.define('secure-submit-button', SecureSubmitButton);
export default SecureSubmitButton;
//# sourceMappingURL=secure-submit-button.js.map