/**
 * @fileoverview Secure Date/Time Picker Component
 *
 * A security-first date/time picker component that implements progressive enhancement,
 * validation, and audit logging.
 *
 * Progressive Enhancement Strategy:
 * 1. Without JavaScript: Falls back to native HTML5 date/time inputs
 * 2. With JavaScript: Enhances with validation, range limits, audit logging
 *
 * Usage:
 * <secure-datetime
 *   security-tier="authenticated"
 *   name="appointment"
 *   label="Appointment Date"
 *   type="datetime-local"
 *   min="2024-01-01T00:00"
 *   max="2024-12-31T23:59"
 *   required
 * ></secure-datetime>
 *
 * Security Features:
 * - Input sanitization and validation
 * - Date range enforcement
 * - Rate limiting for sensitive/critical tiers
 * - Comprehensive audit logging
 * - Timezone awareness
 * - Format validation
 *
 * @module secure-datetime
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
import { SecurityTier } from '../../core/security-config.js';
/**
 * Secure DateTime Web Component
 *
 * Provides a security-hardened date/time picker with progressive enhancement.
 * The component works as a standard HTML5 date/time input without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export class SecureDateTime extends SecureBaseComponent {
    /**
     * Input element reference
     * @private
     */
    #inputElement = null;
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
     * Timezone display element
     * @private
     */
    #timezoneElement = null;
    /**
     * Unique ID for this datetime instance
     * @private
     */
    #instanceId = `secure-datetime-${Math.random().toString(36).substr(2, 9)}`;
    /**
     * Observed attributes for this component
     *
     * @static
     */
    static get observedAttributes() {
        return [
            ...super.observedAttributes,
            'name',
            'type',
            'label',
            'required',
            'min',
            'max',
            'step',
            'value',
            'show-timezone'
        ];
    }
    /**
     * Constructor
     */
    constructor() {
        super();
    }
    /**
     * Render the datetime component
     *
     * Security Note: We use native HTML5 date/time inputs wrapped in our web component
     * to ensure progressive enhancement and browser-native date validation.
     *
     * @protected
     */
    render() {
        const fragment = document.createDocumentFragment();
        const config = this.config;
        // Create container
        const container = document.createElement('div');
        container.className = 'datetime-container';
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
        // Create input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-wrapper';
        // Create the datetime input element
        this.#inputElement = document.createElement('input');
        this.#inputElement.id = this.#instanceId;
        this.#inputElement.className = 'datetime-field';
        // Apply attributes
        this.#applyDateTimeAttributes();
        // Set up event listeners
        this.#attachEventListeners();
        inputWrapper.appendChild(this.#inputElement);
        // Add timezone display if requested
        if (this.hasAttribute('show-timezone')) {
            this.#timezoneElement = document.createElement('span');
            this.#timezoneElement.className = 'timezone-display';
            this.#timezoneElement.textContent = this.#getTimezoneString();
            inputWrapper.appendChild(this.#timezoneElement);
        }
        container.appendChild(inputWrapper);
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
     * Apply attributes to the datetime input
     *
     * @private
     */
    #applyDateTimeAttributes() {
        const config = this.config;
        // Name attribute
        const name = this.getAttribute('name');
        if (name) {
            this.#inputElement.name = this.sanitizeValue(name);
        }
        // Type attribute (date, time, datetime-local, month, week)
        const type = this.getAttribute('type') || 'date';
        const validTypes = ['date', 'time', 'datetime-local', 'month', 'week'];
        if (validTypes.includes(type)) {
            this.#inputElement.type = type;
        }
        else {
            console.warn(`Invalid datetime type "${type}", defaulting to "date"`);
            this.#inputElement.type = 'date';
        }
        // Required attribute
        if (this.hasAttribute('required') || config.validation.required) {
            this.#inputElement.required = true;
            this.#inputElement.setAttribute('aria-required', 'true');
        }
        // Min/max constraints
        const min = this.getAttribute('min');
        if (min) {
            this.#inputElement.min = this.#validateDateTimeValue(min);
        }
        const max = this.getAttribute('max');
        if (max) {
            this.#inputElement.max = this.#validateDateTimeValue(max);
        }
        // Step attribute
        const step = this.getAttribute('step');
        if (step) {
            this.#inputElement.step = step;
        }
        // Disabled state
        if (this.hasAttribute('disabled')) {
            this.#inputElement.disabled = true;
        }
        // Readonly state
        if (this.hasAttribute('readonly')) {
            this.#inputElement.readOnly = true;
        }
        // Autocomplete control
        if (!config.storage.allowAutocomplete) {
            this.#inputElement.autocomplete = 'off';
        }
        // Initial value
        const value = this.getAttribute('value');
        if (value) {
            this.#inputElement.value = this.#validateDateTimeValue(value);
        }
    }
    /**
     * Validate and sanitize datetime value
     *
     * Security Note: Prevent injection of invalid date formats
     *
     * @private
     */
    #validateDateTimeValue(value) {
        if (!value)
            return '';
        // Basic format validation based on input type
        const type = this.#inputElement?.type || this.getAttribute('type') || 'date';
        const patterns = {
            'date': /^\d{4}-\d{2}-\d{2}$/,
            'time': /^\d{2}:\d{2}(:\d{2})?$/,
            'datetime-local': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
            'month': /^\d{4}-\d{2}$/,
            'week': /^\d{4}-W\d{2}$/
        };
        const pattern = patterns[type];
        if (pattern && !pattern.test(value)) {
            console.warn(`Invalid ${type} format: ${value}`);
            return '';
        }
        return value;
    }
    /**
     * Get timezone string for display
     *
     * @private
     */
    #getTimezoneString() {
        const offset = new Date().getTimezoneOffset();
        const hours = Math.abs(Math.floor(offset / 60));
        const minutes = Math.abs(offset % 60);
        const sign = offset <= 0 ? '+' : '-';
        return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    /**
     * Attach event listeners
     *
     * @private
     */
    #attachEventListeners() {
        // Focus event - audit logging
        this.#inputElement.addEventListener('focus', () => {
            this.audit('datetime_focused', {
                name: this.#inputElement.name,
                type: this.#inputElement.type
            });
        });
        // Input event - real-time validation
        this.#inputElement.addEventListener('input', (e) => {
            this.#handleInput(e);
        });
        // Change event - validation and audit
        this.#inputElement.addEventListener('change', (e) => {
            this.#handleChange(e);
        });
        // Blur event - final validation
        this.#inputElement.addEventListener('blur', () => {
            this.#validateAndShowErrors();
            this.audit('datetime_blurred', {
                name: this.#inputElement.name,
                hasValue: this.#inputElement.value.length > 0
            });
        });
    }
    /**
     * Handle input events
     *
     * @private
     */
    #handleInput(_event) {
        // Clear previous errors on input
        this.#clearErrors();
        // Dispatch custom event for parent forms
        this.dispatchEvent(new CustomEvent('secure-datetime', {
            detail: {
                name: this.#inputElement.name,
                value: this.#inputElement.value,
                type: this.#inputElement.type,
                tier: this.securityTier
            },
            bubbles: true,
            composed: true
        }));
    }
    /**
     * Handle change events
     *
     * @private
     */
    #handleChange(_event) {
        const value = this.#inputElement.value;
        // Validate the value
        const isValid = this.#validateDateTimeValue(value);
        if (!isValid && value) {
            this.#showError('Invalid date/time format');
            return;
        }
        // Clear errors
        this.#clearErrors();
        // Audit log
        this.audit('datetime_changed', {
            name: this.#inputElement.name,
            type: this.#inputElement.type,
            value: value
        });
    }
    /**
     * Validate the datetime and show error messages
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
        const value = this.#inputElement.value;
        // Check required
        if (this.#inputElement.required && !value) {
            this.#showError('This field is required');
            return;
        }
        // Check min/max constraints
        if (value) {
            if (this.#inputElement.min && value < this.#inputElement.min) {
                this.#showError(`Value must be after ${this.#formatDateForDisplay(this.#inputElement.min)}`);
                return;
            }
            if (this.#inputElement.max && value > this.#inputElement.max) {
                this.#showError(`Value must be before ${this.#formatDateForDisplay(this.#inputElement.max)}`);
                return;
            }
        }
        // Additional validation for CRITICAL tier
        if (this.securityTier === SecurityTier.CRITICAL && value) {
            const date = new Date(value);
            // Ensure date is valid
            if (isNaN(date.getTime())) {
                this.#showError('Invalid date/time');
                return;
            }
            // Prevent dates too far in the past or future (potential attack)
            const year = date.getFullYear();
            if (year < 1900 || year > 2100) {
                this.#showError('Date must be between 1900 and 2100');
                return;
            }
        }
    }
    /**
     * Format date for display in error messages
     *
     * @private
     */
    #formatDateForDisplay(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        }
        catch (e) {
            return dateString;
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
        this.#inputElement.classList.add('error');
        this.#inputElement.setAttribute('aria-invalid', 'true');
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
        this.#inputElement.classList.remove('error');
        this.#inputElement.removeAttribute('aria-invalid');
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
    return `.datetime-container{margin-bottom:var(--secure-ui-form-gap);font-family:var(--secure-ui-font-family-base)}label{display:block;margin-bottom:var(--secure-ui-form-label-margin-bottom);font-size:var(--secure-ui-label-font-size);font-weight:var(--secure-ui-label-font-weight);color:var(--secure-ui-label-color)}.label-suffix{font-weight:var(--secure-ui-font-weight-normal);color:var(--secure-ui-color-text-secondary);font-size:var(--secure-ui-font-size-xs);margin-left:var(--secure-ui-space-1)}.security-badge{display:inline-block;padding:var(--secure-ui-badge-padding);margin-left:var(--secure-ui-space-2);font-size:var(--secure-ui-badge-font-size);font-weight:var(--secure-ui-font-weight-semibold);border-radius:var(--secure-ui-badge-border-radius);text-transform:uppercase;background-color:var(--secure-ui-color-bg-tertiary);color:var(--secure-ui-color-text-secondary);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border)}.input-wrapper{position:relative}.datetime-field{width:100%;height:var(--secure-ui-input-height);padding:var(--secure-ui-input-padding-y) var(--secure-ui-input-padding-x);font-family:var(--secure-ui-font-family-base);font-size:var(--secure-ui-input-font-size);line-height:var(--secure-ui-line-height-normal);color:var(--secure-ui-input-text-color);background-color:var(--secure-ui-input-bg);border:var(--secure-ui-input-border-width) solid var(--secure-ui-input-border-color);border-radius:var(--secure-ui-input-border-radius);transition:all var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out);cursor:pointer;box-sizing:border-box}.datetime-field::placeholder{color:var(--secure-ui-input-placeholder-color)}.datetime-field:hover:not(:disabled):not([readonly]){border-color:var(--secure-ui-input-border-color-hover)}.datetime-field:focus{outline:none;border-color:var(--secure-ui-input-border-color-focus);box-shadow:var(--secure-ui-shadow-focus)}.datetime-field.error{border-color:var(--secure-ui-color-error)}.datetime-field.error:focus{box-shadow:var(--secure-ui-shadow-focus-error)}.datetime-field:disabled{background-color:var(--secure-ui-input-disabled-bg);cursor:not-allowed;opacity:var(--secure-ui-input-disabled-opacity)}.datetime-field[readonly]{background-color:var(--secure-ui-color-bg-secondary);cursor:default}.input-wrapper::after{content:'📅';position:absolute;right:var(--secure-ui-space-3);top:50%;transform:translateY(-50%);pointer-events:none;font-size:var(--secure-ui-font-size-lg);color:var(--secure-ui-color-text-secondary)}.input-wrapper[data-type="time"]::after{content:'🕐'}.input-wrapper[data-type="datetime-local"]::after{content:'📅🕐'}.input-wrapper[data-type="month"]::after{content:'📆'}.input-wrapper[data-type="week"]::after{content:'📅'}.input-wrapper .timezone-display{position:absolute;right:0;bottom:-1.25rem}.range-display{display:none;margin-top:var(--secure-ui-space-2);padding:var(--secure-ui-space-2) var(--secure-ui-space-3);background-color:var(--secure-ui-color-bg-secondary);border-radius:var(--secure-ui-border-radius-sm);font-size:var(--secure-ui-font-size-xs);color:var(--secure-ui-color-text-secondary)}.range-display.visible{display:block}.range-item{margin-bottom:var(--secure-ui-space-1)}.range-item:last-child{margin-bottom:0}.range-label{font-weight:var(--secure-ui-font-weight-medium);margin-right:var(--secure-ui-space-1)}.helper-text{margin-top:var(--secure-ui-space-2);font-size:var(--secure-ui-font-size-xs);color:var(--secure-ui-color-text-secondary);line-height:var(--secure-ui-line-height-normal)}.error-container{position:absolute;margin-top:var(--secure-ui-form-error-margin-top);font-size:var(--secure-ui-error-font-size);color:var(--secure-ui-error-color);line-height:var(--secure-ui-line-height-normal);overflow:hidden;max-height:40px;opacity:1;transform:translateY(0);transition:opacity 0.2s ease-out,transform 0.2s ease-out,max-height 0.2s ease-out,margin-top 0.2s ease-out}.error-container.hidden{max-height:0;opacity:0;transform:translateY(-4px);margin-top:0}@media (prefers-reduced-motion:reduce){.datetime-field,.error-container{transition:none !important}}.datetime-field::-webkit-calendar-picker-indicator{display:inline-block;cursor:pointer;opacity:1;padding:4px;margin-left:4px}.datetime-field:disabled::-webkit-calendar-picker-indicator{cursor:not-allowed;opacity:0.3}.datetime-field::-webkit-inner-spin-button{height:auto;opacity:0.6;cursor:pointer}.datetime-field:valid:not(:placeholder-shown):not(:focus){border-color:var(--secure-ui-color-success)}.datetime-field:invalid:not(:placeholder-shown):not(:focus){border-color:var(--secure-ui-color-error)}.datetime-container:focus-within label{color:var(--secure-ui-color-primary)}.datetime-container.disabled{opacity:var(--secure-ui-input-disabled-opacity)}.datetime-container.disabled label{color:var(--secure-ui-color-text-disabled)}label .required{color:var(--secure-ui-color-error);margin-left:var(--secure-ui-space-1)}`;
  }
    /**
     * Handle attribute changes
     *
     * @protected
     */
    handleAttributeChange(name, _oldValue, newValue) {
        if (!this.#inputElement)
            return;
        switch (name) {
            case 'disabled':
                this.#inputElement.disabled = this.hasAttribute('disabled');
                break;
            case 'readonly':
                this.#inputElement.readOnly = this.hasAttribute('readonly');
                break;
            case 'value':
                if (newValue !== this.#inputElement.value) {
                    this.#inputElement.value = this.#validateDateTimeValue(newValue || '');
                }
                break;
            case 'min':
                this.#inputElement.min = this.#validateDateTimeValue(newValue || '');
                break;
            case 'max':
                this.#inputElement.max = this.#validateDateTimeValue(newValue || '');
                break;
        }
    }
    /**
     * Get the current value
     *
     * @public
     */
    get value() {
        return this.#inputElement ? this.#inputElement.value : '';
    }
    /**
     * Set the value
     *
     * @public
     */
    set value(value) {
        if (this.#inputElement) {
            this.#inputElement.value = this.#validateDateTimeValue(value || '');
        }
    }
    /**
     * Get the input name
     *
     * @public
     */
    get name() {
        return this.#inputElement ? this.#inputElement.name : '';
    }
    /**
     * Get value as Date object
     *
     * @public
     */
    getValueAsDate() {
        if (!this.#inputElement || !this.#inputElement.value) {
            return null;
        }
        try {
            const date = new Date(this.#inputElement.value);
            return isNaN(date.getTime()) ? null : date;
        }
        catch (e) {
            return null;
        }
    }
    /**
     * Set value from Date object
     *
     * @public
     */
    setValueFromDate(date) {
        if (!this.#inputElement || !(date instanceof Date)) {
            return;
        }
        const type = this.#inputElement.type;
        let value = '';
        switch (type) {
            case 'date':
                value = date.toISOString().split('T')[0];
                break;
            case 'time':
                value = date.toTimeString().slice(0, 5);
                break;
            case 'datetime-local':
                value = date.toISOString().slice(0, 16);
                break;
            case 'month':
                value = date.toISOString().slice(0, 7);
                break;
            case 'week':
                // ISO week calculation
                const weekDate = new Date(date);
                weekDate.setHours(0, 0, 0, 0);
                weekDate.setDate(weekDate.getDate() + 4 - (weekDate.getDay() || 7));
                const yearStart = new Date(weekDate.getFullYear(), 0, 1);
                const weekNo = Math.ceil((((weekDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                value = `${weekDate.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
                break;
        }
        this.#inputElement.value = value;
    }
    /**
     * Check if the datetime is valid
     *
     * @public
     */
    get valid() {
        const required = this.hasAttribute('required') || this.config.validation.required;
        const value = this.#inputElement ? this.#inputElement.value : '';
        // Check required
        if (required && !value) {
            return false;
        }
        // Check format
        if (value && !this.#validateDateTimeValue(value)) {
            return false;
        }
        // Check min/max
        if (this.#inputElement) {
            if (this.#inputElement.min && value < this.#inputElement.min) {
                return false;
            }
            if (this.#inputElement.max && value > this.#inputElement.max) {
                return false;
            }
        }
        return true;
    }
    /**
     * Focus the input
     *
     * @public
     */
    focus() {
        if (this.#inputElement) {
            this.#inputElement.focus();
        }
    }
    /**
     * Blur the input
     *
     * @public
     */
    blur() {
        if (this.#inputElement) {
            this.#inputElement.blur();
        }
    }
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clear value
        if (this.#inputElement) {
            this.#inputElement.value = '';
        }
    }
}
// Define the custom element
customElements.define('secure-datetime', SecureDateTime);
export default SecureDateTime;
//# sourceMappingURL=secure-datetime.js.map