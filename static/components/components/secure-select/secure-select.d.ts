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
 * Multiple selection:
 * <secure-select label="Languages" name="langs" multiple size="4">
 *   <option value="en">English</option>
 *   <option value="es">Spanish</option>
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
/**
 * Secure Select Web Component
 *
 * Provides a security-hardened select dropdown with progressive enhancement.
 * The component works as a standard form select without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export declare class SecureSelect extends SecureBaseComponent {
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
     * Render the select component
     *
     * Security Note: We use a native <select> element wrapped in our web component
     * to ensure progressive enhancement. The native select works without JavaScript,
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
     * Get the select name
     *
     * @public
     */
    get name(): string;
    /**
     * Get selected options (for multiple select)
     *
     * @public
     */
    get selectedOptions(): string[];
    /**
     * Check if the select is valid
     *
     * @public
     */
    get valid(): boolean;
    /**
     * Focus the select
     *
     * @public
     */
    focus(): void;
    /**
     * Blur the select
     *
     * @public
     */
    blur(): void;
    /**
     * Add an option programmatically
     *
     * @public
     */
    addOption(value: string, text: string, selected?: boolean): void;
    /**
     * Remove an option by value
     *
     * @public
     */
    removeOption(value: string): void;
    /**
     * Clear all options
     *
     * @public
     */
    clearOptions(): void;
    /**
     * Cleanup on disconnect
     *
     * Note: We intentionally do NOT clear #validOptions here.
     * When <secure-select> is inside a <secure-form>, the form moves its children
     * into a <form> element, which triggers disconnect/reconnect. Clearing
     * #validOptions on disconnect would leave the set empty after reconnect,
     * causing all subsequent selections to be rejected as "invalid option".
     */
    disconnectedCallback(): void;
}
export default SecureSelect;
//# sourceMappingURL=secure-select.d.ts.map