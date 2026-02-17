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
/**
 * Secure DateTime Web Component
 *
 * Provides a security-hardened date/time picker with progressive enhancement.
 * The component works as a standard HTML5 date/time input without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export declare class SecureDateTime extends SecureBaseComponent {
    #private;
    /**
     * Observed attributes for this component
     *
     * @static
     */
    static get observedAttributes(): string[];
    /**
     * Constructor
     */
    constructor();
    /**
     * Render the datetime component
     *
     * Security Note: We use native HTML5 date/time inputs wrapped in our web component
     * to ensure progressive enhancement and browser-native date validation.
     *
     * @protected
     */
    protected render(): DocumentFragment | HTMLElement | null;
    /**
     * Handle attribute changes
     *
     * @protected
     */
    protected handleAttributeChange(name: string, _oldValue: string | null, newValue: string | null): void;
    /**
     * Get the current value
     *
     * @public
     */
    get value(): string;
    /**
     * Set the value
     *
     * @public
     */
    set value(value: string);
    /**
     * Get the input name
     *
     * @public
     */
    get name(): string;
    /**
     * Get value as Date object
     *
     * @public
     */
    getValueAsDate(): Date | null;
    /**
     * Set value from Date object
     *
     * @public
     */
    setValueFromDate(date: Date): void;
    /**
     * Check if the datetime is valid
     *
     * @public
     */
    get valid(): boolean;
    /**
     * Focus the input
     *
     * @public
     */
    focus(): void;
    /**
     * Blur the input
     *
     * @public
     */
    blur(): void;
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback(): void;
}
export default SecureDateTime;
//# sourceMappingURL=secure-datetime.d.ts.map