/**
 * @fileoverview Secure Textarea Component
 *
 * A security-first textarea component that implements progressive enhancement,
 * tier-based validation, character counting, and audit logging.
 *
 * Progressive Enhancement Strategy:
 * 1. Without JavaScript: Falls back to native HTML5 textarea with attributes
 * 2. With JavaScript: Enhances with real-time validation, character limits, rate limiting
 *
 * Usage:
 * <secure-textarea
 *   security-tier="sensitive"
 *   name="bio"
 *   label="Biography"
 *   rows="5"
 *   required
 * ></secure-textarea>
 *
 * Security Features:
 * - XSS prevention via sanitization
 * - Character counting and limits based on security tier
 * - Rate limiting for sensitive/critical tiers
 * - Autocomplete control based on tier
 * - Comprehensive audit logging
 * - Visual security indicators
 *
 * @module secure-textarea
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
/**
 * Secure Textarea Web Component
 *
 * Provides a security-hardened textarea field with progressive enhancement.
 * The component works as a standard form textarea without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export class SecureTextarea extends SecureBaseComponent {
    /**
     * Textarea element reference
     * @private
     */
    #textareaElement = null;
    /**
     * Label element reference
     * @private
     */
    #labelElement = null;
    /**
     * Error container element reference
     * @private
     */
    #errorContainer = null;
    /**
     * Character count display element
     * @private
     */
    #charCountElement = null;
    /**
     * Unique ID for this textarea instance
     * @private
     */
    #instanceId = `secure-textarea-${Math.random().toString(36).substr(2, 9)}`;
    /**
     * Observed attributes for this component
     *
     * @static
     */
    static get observedAttributes() {
        return [
            ...super.observedAttributes,
            'name',
            'label',
            'placeholder',
            'required',
            'minlength',
            'maxlength',
            'rows',
            'cols',
            'wrap',
            'value'
        ];
    }
    /**
     * Constructor
     */
    constructor() {
        super();
    }
    /**
     * Render the textarea component
     *
     * Security Note: We use a native <textarea> element wrapped in our web component
     * to ensure progressive enhancement. The native textarea works without JavaScript,
     * and we enhance it with security features when JS is available.
     *
     * @protected
     */
    render() {
        const fragment = document.createDocumentFragment();
        const config = this.config;
        // Create container
        const container = document.createElement('div');
        container.className = 'textarea-container';
        // Create label
        const label = this.getAttribute('label');
        if (label) {
            this.#labelElement = document.createElement('label');
            this.#labelElement.htmlFor = this.#instanceId;
            this.#labelElement.textContent = this.sanitizeValue(label);
            // Add security tier suffix if configured
            if (config.ui.labelSuffix) {
                const suffix = document.createElement('span');
                suffix.className = 'label-suffix';
                suffix.textContent = config.ui.labelSuffix;
                this.#labelElement.appendChild(suffix);
            }
            // Add security badge if configured
            if (config.ui.showSecurityBadge) {
                const badge = document.createElement('span');
                badge.className = 'security-badge';
                badge.textContent = config.name;
                this.#labelElement.appendChild(badge);
            }
            container.appendChild(this.#labelElement);
        }
        // Create textarea wrapper for progressive enhancement
        const textareaWrapper = document.createElement('div');
        textareaWrapper.className = 'textarea-wrapper';
        // Create the actual textarea element
        this.#textareaElement = document.createElement('textarea');
        this.#textareaElement.id = this.#instanceId;
        this.#textareaElement.className = 'textarea-field';
        // Apply attributes from web component to native textarea
        this.#applyTextareaAttributes();
        // Set up event listeners
        this.#attachEventListeners();
        textareaWrapper.appendChild(this.#textareaElement);
        container.appendChild(textareaWrapper);
        // Create character count display
        this.#charCountElement = document.createElement('span');
        this.#charCountElement.className = 'char-count';
        this.#updateCharCount();
        container.appendChild(this.#charCountElement);
        // Create error container
        this.#errorContainer = document.createElement('div');
        this.#errorContainer.className = 'error-container hidden';
        this.#errorContainer.setAttribute('role', 'alert');
        this.#errorContainer.setAttribute('aria-live', 'polite');
        container.appendChild(this.#errorContainer);
        // Add component styles (CSP-compliant via adoptedStyleSheets)
        this.addComponentStyles(this.#getComponentStyles());
        fragment.appendChild(container);
        return fragment;
    }
    /**
     * Apply attributes from the web component to the native textarea
     *
     * Security Note: This is where we enforce tier-specific security controls
     * like autocomplete, caching, and validation rules.
     *
     * @private
     */
    #applyTextareaAttributes() {
        const config = this.config;
        // Name attribute (required for form submission)
        const name = this.getAttribute('name');
        if (name) {
            this.#textareaElement.name = this.sanitizeValue(name);
        }
        // Placeholder
        const placeholder = this.getAttribute('placeholder');
        if (placeholder) {
            this.#textareaElement.placeholder = this.sanitizeValue(placeholder);
        }
        // Required attribute
        if (this.hasAttribute('required') || config.validation.required) {
            this.#textareaElement.required = true;
            this.#textareaElement.setAttribute('aria-required', 'true');
        }
        // Length constraints
        const minLength = this.getAttribute('minlength');
        if (minLength) {
            this.#textareaElement.minLength = parseInt(minLength, 10);
        }
        const maxLength = this.getAttribute('maxlength') || config.validation.maxLength;
        if (maxLength) {
            this.#textareaElement.maxLength = parseInt(String(maxLength), 10);
        }
        // Rows and columns
        const rows = this.getAttribute('rows') || 3;
        this.#textareaElement.rows = parseInt(String(rows), 10);
        const cols = this.getAttribute('cols');
        if (cols) {
            this.#textareaElement.cols = parseInt(cols, 10);
        }
        // Wrap attribute
        const wrap = this.getAttribute('wrap') || 'soft';
        this.#textareaElement.wrap = wrap;
        // CRITICAL SECURITY: Autocomplete control based on tier
        // For SENSITIVE and CRITICAL tiers, we disable autocomplete to prevent
        // browser storage of sensitive data
        if (config.storage.allowAutocomplete) {
            const autocomplete = this.getAttribute('autocomplete') || 'on';
            this.#textareaElement.autocomplete = autocomplete;
        }
        else {
            this.#textareaElement.autocomplete = 'off';
        }
        // Disabled state
        if (this.hasAttribute('disabled')) {
            this.#textareaElement.disabled = true;
        }
        // Readonly state
        if (this.hasAttribute('readonly')) {
            this.#textareaElement.readOnly = true;
        }
        // Initial value
        const value = this.getAttribute('value');
        if (value) {
            this.#textareaElement.value = value;
        }
    }
    /**
     * Attach event listeners to the textarea
     *
     * @private
     */
    #attachEventListeners() {
        // Focus event - audit logging
        this.#textareaElement.addEventListener('focus', () => {
            this.audit('textarea_focused', {
                name: this.#textareaElement.name
            });
        });
        // Input event - real-time validation and character counting
        this.#textareaElement.addEventListener('input', (e) => {
            this.#handleInput(e);
        });
        // Blur event - final validation
        this.#textareaElement.addEventListener('blur', () => {
            this.#validateAndShowErrors();
            this.audit('textarea_blurred', {
                name: this.#textareaElement.name,
                hasValue: this.#textareaElement.value.length > 0
            });
        });
        // Change event - audit logging
        this.#textareaElement.addEventListener('change', () => {
            this.audit('textarea_changed', {
                name: this.#textareaElement.name,
                valueLength: this.#textareaElement.value.length
            });
        });
    }
    /**
     * Handle input events
     *
     * Security Note: This is where we implement real-time validation and character counting.
     *
     * @private
     */
    #handleInput(_event) {
        // Update character count
        this.#updateCharCount();
        // Clear previous errors on input (improve UX)
        this.#clearErrors();
        // Dispatch custom event for parent forms
        this.dispatchEvent(new CustomEvent('secure-textarea', {
            detail: {
                name: this.#textareaElement.name,
                value: this.#textareaElement.value,
                tier: this.securityTier
            },
            bubbles: true,
            composed: true
        }));
    }
    /**
     * Update character count display
     *
     * @private
     */
    #updateCharCount() {
        const currentLength = this.#textareaElement.value.length;
        const maxLength = this.#textareaElement.maxLength;
        if (maxLength > 0) {
            this.#charCountElement.textContent = `${currentLength} / ${maxLength}`;
            // Warn when approaching limit
            if (currentLength > maxLength * 0.9) {
                this.#charCountElement.classList.add('warning');
            }
            else {
                this.#charCountElement.classList.remove('warning');
            }
        }
        else {
            this.#charCountElement.textContent = `${currentLength}`;
        }
    }
    /**
     * Validate the textarea and show error messages
     *
     * @private
     */
    #validateAndShowErrors() {
        // Check rate limit first
        const rateLimitCheck = this.checkRateLimit();
        if (!rateLimitCheck.allowed) {
            this.#showError(`Too many attempts. Please wait ${Math.ceil(rateLimitCheck.retryAfter / 1000)} seconds.`);
            return;
        }
        // Perform validation
        const minLength = this.getAttribute('minlength');
        const maxLength = this.getAttribute('maxlength');
        const validation = this.validateInput(this.#textareaElement.value, {
            minLength: minLength ? parseInt(minLength, 10) : 0,
            maxLength: maxLength ? parseInt(maxLength, 10) : this.config.validation.maxLength
        });
        if (!validation.valid) {
            this.#showError(validation.errors.join(', '));
        }
    }
    /**
     * Show error message
     *
     * @private
     */
    #showError(message) {
        this.#errorContainer.textContent = message;
        // Force reflow so browser registers the hidden state with content,
        // then remove hidden to trigger the CSS transition
        void this.#errorContainer.offsetHeight;
        this.#errorContainer.classList.remove('hidden');
        this.#textareaElement.classList.add('error');
        this.#textareaElement.setAttribute('aria-invalid', 'true');
    }
    /**
     * Clear error messages
     *
     * @private
     */
    #clearErrors() {
        // Start the hide animation first, clear text only after transition ends
        this.#errorContainer.classList.add('hidden');
        this.#errorContainer.addEventListener('transitionend', () => {
            if (this.#errorContainer.classList.contains('hidden')) {
                this.#errorContainer.textContent = '';
            }
        }, { once: true });
        this.#textareaElement.classList.remove('error');
        this.#textareaElement.removeAttribute('aria-invalid');
    }
    /**
     * Get component-specific styles
     *
     * @private
     */
    /**
   * Get component styles
   * @private
   * @returns {string} Component CSS
   */
  #getComponentStyles() {
    return `.textarea-container{margin-bottom:var(--secure-ui-form-gap);font-family:var(--secure-ui-font-family-base)}label{display:block;margin-bottom:var(--secure-ui-form-label-margin-bottom);font-size:var(--secure-ui-label-font-size);font-weight:var(--secure-ui-label-font-weight);color:var(--secure-ui-label-color)}.label-suffix{font-weight:var(--secure-ui-font-weight-normal);color:var(--secure-ui-color-text-secondary);font-size:var(--secure-ui-font-size-xs);margin-left:var(--secure-ui-space-1)}.security-badge{display:inline-block;padding:var(--secure-ui-badge-padding);margin-left:var(--secure-ui-space-2);font-size:var(--secure-ui-badge-font-size);font-weight:var(--secure-ui-font-weight-semibold);border-radius:var(--secure-ui-badge-border-radius);text-transform:uppercase;background-color:var(--secure-ui-color-bg-tertiary);color:var(--secure-ui-color-text-secondary);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border)}.textarea-wrapper{position:relative}.textarea-field{width:100%;min-height:var(--secure-ui-textarea-min-height);padding:var(--secure-ui-textarea-padding);font-family:var(--secure-ui-font-family-base);font-size:var(--secure-ui-input-font-size);line-height:var(--secure-ui-line-height-normal);color:var(--secure-ui-input-text-color);background-color:var(--secure-ui-input-bg);border:var(--secure-ui-input-border-width) solid var(--secure-ui-input-border-color);border-radius:var(--secure-ui-input-border-radius);transition:all var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out);resize:vertical;box-sizing:border-box}.textarea-field::placeholder{color:var(--secure-ui-input-placeholder-color)}.textarea-field:hover:not(:disabled){border-color:var(--secure-ui-input-border-color-hover)}.textarea-field:focus{outline:none;border-color:var(--secure-ui-input-border-color-focus);box-shadow:var(--secure-ui-shadow-focus)}.textarea-field.error{border-color:var(--secure-ui-color-error)}.textarea-field.error:focus{box-shadow:var(--secure-ui-shadow-focus-error)}.textarea-field:read-only:not(:disabled){background-color:var(--secure-ui-color-bg-secondary);cursor:default;resize:none}.textarea-field:disabled{background-color:var(--secure-ui-input-disabled-bg);cursor:not-allowed;opacity:var(--secure-ui-input-disabled-opacity)}.char-count{display:block;margin-top:var(--secure-ui-space-1);font-size:var(--secure-ui-font-size-xs);color:var(--secure-ui-color-text-secondary);text-align:right}.char-count.warning{color:var(--secure-ui-color-warning);font-weight:var(--secure-ui-font-weight-medium)}.error-container{margin-top:var(--secure-ui-form-error-margin-top);font-size:var(--secure-ui-error-font-size);color:var(--secure-ui-error-color);line-height:var(--secure-ui-line-height-normal);overflow:hidden;max-height:40px;opacity:1;transform:translateY(0);transition:opacity 0.2s ease-out,transform 0.2s ease-out,max-height 0.2s ease-out,margin-top 0.2s ease-out}.error-container.hidden{max-height:0;opacity:0;transform:translateY(-4px);margin-top:0}@media (prefers-reduced-motion:reduce){.textarea-field,.error-container{transition:none !important}}:host([security-tier="authenticated"]) .textarea-field{border-color:var(--secure-ui-tier-authenticated)}:host([security-tier="sensitive"]) .textarea-field{border-color:var(--secure-ui-tier-sensitive)}:host([security-tier="critical"]) .textarea-field{border-color:var(--secure-ui-tier-critical)}`;
  }
    /**
     * Handle attribute changes
     *
     * @protected
     */
    handleAttributeChange(name, _oldValue, newValue) {
        if (!this.#textareaElement)
            return;
        switch (name) {
            case 'disabled':
                this.#textareaElement.disabled = this.hasAttribute('disabled');
                break;
            case 'readonly':
                this.#textareaElement.readOnly = this.hasAttribute('readonly');
                break;
            case 'value':
                if (newValue !== this.#textareaElement.value) {
                    this.#textareaElement.value = newValue || '';
                    this.#updateCharCount();
                }
                break;
        }
    }
    /**
     * Get the current value
     *
     * @public
     */
    get value() {
        return this.#textareaElement ? this.#textareaElement.value : '';
    }
    /**
     * Set the value
     *
     * @public
     */
    set value(value) {
        if (this.#textareaElement) {
            this.#textareaElement.value = value || '';
            this.#updateCharCount();
        }
    }
    /**
     * Get the textarea name
     *
     * @public
     */
    get name() {
        return this.#textareaElement ? this.#textareaElement.name : '';
    }
    /**
     * Check if the textarea is valid
     *
     * @public
     */
    get valid() {
        const minLength = this.getAttribute('minlength');
        const maxLength = this.getAttribute('maxlength');
        const required = this.hasAttribute('required');
        // Check required field first
        if (required || this.config.validation.required) {
            if (!this.#textareaElement.value || this.#textareaElement.value.trim().length === 0) {
                return false;
            }
        }
        const validation = this.validateInput(this.#textareaElement.value, {
            minLength: minLength ? parseInt(minLength, 10) : 0,
            maxLength: maxLength ? parseInt(maxLength, 10) : this.config.validation.maxLength
        });
        return validation.valid;
    }
    /**
     * Focus the textarea
     *
     * @public
     */
    focus() {
        if (this.#textareaElement) {
            this.#textareaElement.focus();
        }
    }
    /**
     * Blur the textarea
     *
     * @public
     */
    blur() {
        if (this.#textareaElement) {
            this.#textareaElement.blur();
        }
    }
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clear sensitive data from memory
        if (this.#textareaElement) {
            this.#textareaElement.value = '';
        }
    }
}
// Define the custom element
customElements.define('secure-textarea', SecureTextarea);
export default SecureTextarea;
//# sourceMappingURL=secure-textarea.js.map