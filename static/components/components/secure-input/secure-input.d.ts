/**
 * @fileoverview Secure Input Component
 *
 * A security-first input field component that implements progressive enhancement,
 * tier-based validation, masking, and audit logging.
 *
 * Progressive Enhancement Strategy:
 * 1. Without JavaScript: Falls back to native HTML5 input with attributes
 * 2. With JavaScript: Enhances with masking, real-time validation, rate limiting
 *
 * Usage:
 * <secure-input
 *   security-tier="critical"
 *   name="password"
 *   label="Password"
 *   type="password"
 *   required
 * ></secure-input>
 *
 * Security Features:
 * - XSS prevention via sanitization
 * - Configurable masking based on security tier
 * - Rate limiting for sensitive/critical tiers
 * - Autocomplete control based on tier
 * - Comprehensive audit logging
 * - Visual security indicators
 *
 * @module secure-input
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
/**
 * Secure Input Web Component
 *
 * Provides a security-hardened input field with progressive enhancement.
 * The component works as a standard form input without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export declare class SecureInput extends SecureBaseComponent {
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
     * Render the input component
     *
     * Security Note: We use a native <input> element wrapped in our web component
     * to ensure progressive enhancement. The native input works without JavaScript,
     * and we enhance it with security features when JS is available.
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
     * Get the current value (unmasked)
     *
     * Security Note: This exposes the actual value. Only call this when
     * submitting the form or when you have proper authorization.
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
     * Check if the input is valid
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
export default SecureInput;
//# sourceMappingURL=secure-input.d.ts.map