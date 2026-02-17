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
export declare class SecureTextarea extends SecureBaseComponent {
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
     * Render the textarea component
     *
     * Security Note: We use a native <textarea> element wrapped in our web component
     * to ensure progressive enhancement. The native textarea works without JavaScript,
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
     * Get the textarea name
     *
     * @public
     */
    get name(): string;
    /**
     * Check if the textarea is valid
     *
     * @public
     */
    get valid(): boolean;
    /**
     * Focus the textarea
     *
     * @public
     */
    focus(): void;
    /**
     * Blur the textarea
     *
     * @public
     */
    blur(): void;
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback(): void;
}
export default SecureTextarea;
//# sourceMappingURL=secure-textarea.d.ts.map