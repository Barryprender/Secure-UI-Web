/**
 * @fileoverview Secure Select Component
 *
 * A security-first select dropdown component that implements progressive enhancement,
 * tier-based validation, and audit logging.
 *
 * Progressive Enhancement Strategy:
 * 1. Without JavaScript: Falls back to native HTML5 select with options
 * 2. With JavaScript: Enhances with validation, audit logging, rate limiting
 *
 * Usage:
 * <secure-select
 *   security-tier="authenticated"
 *   name="country"
 *   label="Country"
 *   required
 * >
 *   <option value="">Select a country</option>
 *   <option value="us">United States</option>
 *   <option value="uk">United Kingdom</option>
 * </secure-select>
 *
 * Security Features:
 * - XSS prevention via sanitization
 * - Option value validation
 * - Rate limiting for sensitive/critical tiers
 * - Comprehensive audit logging
 * - Visual security indicators
 *
 * @module secure-select
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
import { getDarkerColor, addAlpha } from '../../core/color-utils.js';
/**
 * Secure Select Web Component
 *
 * Provides a security-hardened select dropdown with progressive enhancement.
 * The component works as a standard form select without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export class SecureSelect extends SecureBaseComponent {
    /**
     * Select element reference
     * @private
     */
    #selectElement = null;
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
     * Unique ID for this select instance
     * @private
     */
    #instanceId = `secure-select-${Math.random().toString(36).substr(2, 9)}`;
    /**
     * Valid option values
     * @private
     */
    #validOptions = new Set();
    /**
     * Flag to track if options have been transferred from light DOM
     * @private
     */
    #optionsTransferred = false;
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
            'required',
            'multiple',
            'size',
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
     * Render the select component
     *
     * Security Note: We use a native <select> element wrapped in our web component
     * to ensure progressive enhancement. The native select works without JavaScript,
     * and we enhance it with security features when JS is available.
     *
     * @protected
     */
    render() {
        const fragment = document.createDocumentFragment();
        const config = this.config;
        // Create container
        const container = document.createElement('div');
        container.className = 'select-container';
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
        // Create select wrapper for progressive enhancement
        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'select-wrapper';
        // Create the actual select element
        this.#selectElement = document.createElement('select');
        this.#selectElement.id = this.#instanceId;
        this.#selectElement.className = 'select-field';
        // Apply attributes from web component to native select
        this.#applySelectAttributes();
        // Set up event listeners
        this.#attachEventListeners();
        // Defer transferring options to allow light DOM to be fully parsed
        // This handles the case where the component is created before its children
        queueMicrotask(() => {
            this.#transferOptions();
        });
        selectWrapper.appendChild(this.#selectElement);
        container.appendChild(selectWrapper);
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
     * Apply attributes from the web component to the native select
     *
     * Security Note: This is where we enforce tier-specific security controls
     * like validation rules.
     *
     * @private
     */
    #applySelectAttributes() {
        const config = this.config;
        // Name attribute (required for form submission)
        const name = this.getAttribute('name');
        if (name) {
            this.#selectElement.name = this.sanitizeValue(name);
        }
        // Required attribute
        if (this.hasAttribute('required') || config.validation.required) {
            this.#selectElement.required = true;
            this.#selectElement.setAttribute('aria-required', 'true');
        }
        // Multiple selection
        if (this.hasAttribute('multiple')) {
            this.#selectElement.multiple = true;
        }
        // Size attribute
        const size = this.getAttribute('size');
        if (size) {
            this.#selectElement.size = parseInt(size, 10);
        }
        // Disabled state
        if (this.hasAttribute('disabled')) {
            this.#selectElement.disabled = true;
        }
        // Autocomplete control
        if (!config.storage.allowAutocomplete) {
            this.#selectElement.autocomplete = 'off';
        }
    }
    /**
     * Transfer option elements from light DOM to select element
     *
     * Security Note: We sanitize all option values and text to prevent XSS
     *
     * @private
     */
    #transferOptions() {
        // Only transfer once to avoid clearing programmatically-added options
        if (this.#optionsTransferred)
            return;
        this.#optionsTransferred = true;
        // Get option elements from light DOM (original content)
        const options = Array.from(this.querySelectorAll('option'));
        // If no light DOM options, nothing to transfer
        if (options.length === 0)
            return;
        // Track the value of any option with "selected" attribute
        let selectedValue = null;
        // Transfer each option to the select element
        options.forEach((option) => {
            const newOption = document.createElement('option');
            // Sanitize value
            const value = option.getAttribute('value') || '';
            newOption.value = this.sanitizeValue(value);
            this.#validOptions.add(newOption.value);
            // Sanitize text content
            newOption.textContent = this.sanitizeValue(option.textContent || '');
            // Copy other attributes
            if (option.hasAttribute('selected')) {
                newOption.selected = true;
                selectedValue = newOption.value;
            }
            if (option.hasAttribute('disabled')) {
                newOption.disabled = true;
            }
            this.#selectElement.appendChild(newOption);
        });
        // Set initial value - attribute takes precedence over selected option
        const initialValue = this.getAttribute('value');
        if (initialValue) {
            this.#selectElement.value = initialValue;
        }
        else if (selectedValue !== null) {
            // Apply the value from the option with "selected" attribute
            this.#selectElement.value = selectedValue;
        }
    }
    /**
     * Attach event listeners to the select
     *
     * @private
     */
    #attachEventListeners() {
        // Focus event - audit logging
        this.#selectElement.addEventListener('focus', () => {
            this.audit('select_focused', {
                name: this.#selectElement.name
            });
        });
        // Change event - validation and audit logging
        this.#selectElement.addEventListener('change', (e) => {
            this.#handleChange(e);
        });
        // Blur event - final validation
        this.#selectElement.addEventListener('blur', () => {
            this.#validateAndShowErrors();
            this.audit('select_blurred', {
                name: this.#selectElement.name,
                hasValue: this.#selectElement.value.length > 0
            });
        });
    }
    /**
     * Handle change events
     *
     * Security Note: We validate that the selected value is in the list of valid options
     * to prevent value injection attacks.
     *
     * @private
     */
    #handleChange(_event) {
        // Validate selected value is in valid options list
        const selectedValue = this.#selectElement.value;
        if (selectedValue && !this.#validOptions.has(selectedValue)) {
            this.#showError('Invalid option selected');
            this.audit('invalid_option_detected', {
                name: this.#selectElement.name,
                attemptedValue: selectedValue
            });
            // Reset to empty value
            this.#selectElement.value = '';
            return;
        }
        // Clear previous errors
        this.#clearErrors();
        // Log the change
        this.audit('select_changed', {
            name: this.#selectElement.name,
            value: selectedValue
        });
        // Dispatch custom event for parent forms
        this.dispatchEvent(new CustomEvent('secure-select', {
            detail: {
                name: this.#selectElement.name,
                value: selectedValue,
                tier: this.securityTier
            },
            bubbles: true,
            composed: true
        }));
    }
    /**
     * Validate the select and show error messages
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
        // Check required field
        const required = this.hasAttribute('required') || this.config.validation.required;
        if (required && !this.#selectElement.value) {
            this.#showError('Please select an option');
            return;
        }
        // Validate value is in valid options
        const selectedValue = this.#selectElement.value;
        if (selectedValue && !this.#validOptions.has(selectedValue)) {
            this.#showError('Invalid option selected');
            return;
        }
    }
    /**
     * Show error message
     *
     * @private
     */
    #showError(message) {
        this.#errorContainer.textContent = message;
        this.#errorContainer.classList.remove('hidden');
        this.#selectElement.classList.add('error');
        this.#selectElement.setAttribute('aria-invalid', 'true');
    }
    /**
     * Clear error messages
     *
     * @private
     */
    #clearErrors() {
        this.#errorContainer.textContent = '';
        this.#errorContainer.classList.add('hidden');
        this.#selectElement.classList.remove('error');
        this.#selectElement.removeAttribute('aria-invalid');
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
    return `.select-container{margin-bottom:var(--secure-ui-form-gap);font-family:var(--secure-ui-font-family-base)}label{display:block;margin-bottom:var(--secure-ui-form-label-margin-bottom);font-size:var(--secure-ui-label-font-size);font-weight:var(--secure-ui-label-font-weight);color:var(--secure-ui-label-color)}.label-suffix{font-weight:var(--secure-ui-font-weight-normal);color:var(--secure-ui-color-text-secondary);font-size:var(--secure-ui-font-size-xs);margin-left:var(--secure-ui-space-1)}.security-badge{display:inline-block;padding:var(--secure-ui-badge-padding);margin-left:var(--secure-ui-space-2);font-size:var(--secure-ui-badge-font-size);font-weight:var(--secure-ui-font-weight-semibold);border-radius:var(--secure-ui-badge-border-radius);text-transform:uppercase;background-color:var(--secure-ui-color-bg-tertiary);color:var(--secure-ui-color-text-secondary);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border)}.select-wrapper{position:relative}.select-field{width:100%;height:var(--secure-ui-select-height);padding:var(--secure-ui-select-padding);font-family:var(--secure-ui-font-family-base);font-size:var(--secure-ui-input-font-size);line-height:var(--secure-ui-line-height-normal);color:var(--secure-ui-select-color);background-color:var(--secure-ui-input-bg);border:var(--secure-ui-input-border-width) solid var(--secure-ui-input-border-color);border-radius:var(--secure-ui-input-border-radius);transition:all var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out);cursor:pointer;box-sizing:border-box}.select-field option{color:red;background-color:var(--secure-ui-input-bg)}.select-field option+option{border-top:1px solid var(--secure-ui-input-border-color)}.select-field:hover:not(:disabled){border-color:var(--secure-ui-input-border-color-hover)}.select-field:focus{outline:none;border-color:var(--secure-ui-input-border-color-focus);box-shadow:var(--secure-ui-shadow-focus)}.select-field.error{border-color:var(--secure-ui-color-error)}.select-field.error:focus{box-shadow:var(--secure-ui-shadow-focus-error)}.select-field:disabled{background-color:var(--secure-ui-input-disabled-bg);cursor:not-allowed;opacity:var(--secure-ui-input-disabled-opacity)}.select-field[multiple]{height:auto;min-height:calc(var(--secure-ui-select-height) * 2);padding:var(--secure-ui-space-2)}.error-container{display:none;margin-top:var(--secure-ui-form-error-margin-top);font-size:var(--secure-ui-error-font-size);color:var(--secure-ui-error-color);line-height:var(--secure-ui-line-height-normal)}:host([security-tier="authenticated"]) .select-field{border-color:var(--secure-ui-tier-authenticated)}:host([security-tier="sensitive"]) .select-field{border-color:var(--secure-ui-tier-sensitive)}:host([security-tier="critical"]) .select-field{border-color:var(--secure-ui-tier-critical)}`;
  }
    /**
     * Handle attribute changes
     *
     * @protected
     */
    handleAttributeChange(name, _oldValue, newValue) {
        if (!this.#selectElement)
            return;
        switch (name) {
            case 'disabled':
                this.#selectElement.disabled = this.hasAttribute('disabled');
                break;
            case 'value':
                if (newValue !== this.#selectElement.value) {
                    this.#selectElement.value = newValue || '';
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
        return this.#selectElement ? this.#selectElement.value : '';
    }
    /**
     * Set the value
     *
     * @public
     */
    set value(value) {
        if (this.#selectElement && this.#validOptions.has(value)) {
            this.#selectElement.value = value;
        }
    }
    /**
     * Get the select name
     *
     * @public
     */
    get name() {
        return this.#selectElement ? this.#selectElement.name : '';
    }
    /**
     * Get selected options (for multiple select)
     *
     * @public
     */
    get selectedOptions() {
        if (!this.#selectElement)
            return [];
        return Array.from(this.#selectElement.selectedOptions).map(opt => opt.value);
    }
    /**
     * Check if the select is valid
     *
     * @public
     */
    get valid() {
        const required = this.hasAttribute('required') || this.config.validation.required;
        // Check required field
        if (required && !this.#selectElement.value) {
            return false;
        }
        // Validate value is in valid options
        const selectedValue = this.#selectElement.value;
        if (selectedValue && !this.#validOptions.has(selectedValue)) {
            return false;
        }
        return true;
    }
    /**
     * Focus the select
     *
     * @public
     */
    focus() {
        if (this.#selectElement) {
            this.#selectElement.focus();
        }
    }
    /**
     * Blur the select
     *
     * @public
     */
    blur() {
        if (this.#selectElement) {
            this.#selectElement.blur();
        }
    }
    /**
     * Add an option programmatically
     *
     * @public
     */
    addOption(value, text, selected = false) {
        if (!this.#selectElement)
            return;
        const option = document.createElement('option');
        option.value = this.sanitizeValue(value);
        option.textContent = this.sanitizeValue(text);
        option.selected = selected;
        this.#validOptions.add(option.value);
        this.#selectElement.appendChild(option);
    }
    /**
     * Remove an option by value
     *
     * @public
     */
    removeOption(value) {
        if (!this.#selectElement)
            return;
        const options = Array.from(this.#selectElement.options);
        const option = options.find(opt => opt.value === value);
        if (option) {
            this.#selectElement.removeChild(option);
            this.#validOptions.delete(value);
        }
    }
    /**
     * Clear all options
     *
     * @public
     */
    clearOptions() {
        if (!this.#selectElement)
            return;
        this.#selectElement.innerHTML = '';
        this.#validOptions.clear();
    }
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clear valid options
        this.#validOptions.clear();
    }
}
// Define the custom element
customElements.define('secure-select', SecureSelect);
export default SecureSelect;
//# sourceMappingURL=secure-select.js.map