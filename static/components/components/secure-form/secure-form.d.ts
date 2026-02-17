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
import type { SecurityTierValue } from '../../core/types.js';
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
export declare class SecureForm extends HTMLElement {
    #private;
    /** @private Whether component styles have been added to the document */
    static __stylesAdded: boolean;
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
     * Called when element is connected to DOM
     *
     * Progressive Enhancement Strategy:
     * - Create a native <form> in light DOM (not Shadow DOM)
     * - Move all children into the form
     * - Add CSRF token as hidden field
     * - Attach event listeners for validation and optional enhancement
     */
    connectedCallback(): void;
    /**
     * Get form data
     *
     * @public
     */
    getData(): Record<string, string>;
    /**
     * Reset the form
     *
     * @public
     */
    reset(): void;
    /**
     * Programmatically submit the form
     *
     * @public
     */
    submit(): void;
    /**
     * Check if form is valid
     *
     * @public
     */
    get valid(): boolean;
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback(): void;
    /**
     * Handle attribute changes
     */
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    /**
     * Get security tier
     */
    get securityTier(): SecurityTierValue;
    /**
     * Sanitize a value to prevent XSS
     */
    sanitizeValue(value: string): string;
    /**
     * Audit log helper
     */
    audit(action: string, data: Record<string, unknown>): void;
    /**
     * Check rate limit (stub - implement proper rate limiting in production)
     */
    checkRateLimit(): {
        allowed: boolean;
        retryAfter: number;
    };
}
export default SecureForm;
//# sourceMappingURL=secure-form.d.ts.map