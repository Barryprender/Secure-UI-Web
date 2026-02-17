/**
 * @fileoverview Base Component Class for Secure-UI
 *
 * This module provides the foundational class that all Secure-UI web components
 * extend. It implements core security features, progressive enhancement,
 * and standardized lifecycle management.
 *
 * Security Features:
 * - Closed Shadow DOM (prevents external JavaScript access)
 * - Automatic XSS sanitization
 * - Security tier enforcement
 * - Audit logging infrastructure
 * - Rate limiting support
 * - Progressive enhancement (works without JS)
 *
 * @module base-component
 * @license MIT
 */
import type { SecurityTierValue, TierConfig, ValidationResult, ValidationOptions, RateLimitResult, AuditLogEntry } from './types.js';
/**
 * Base class for all Secure-UI components
 *
 * All components in the Secure-UI library should extend this class to inherit
 * core security functionality and standardized behavior.
 *
 * Security Architecture:
 * - Closed Shadow DOM prevents external tampering
 * - All attributes are sanitized on read
 * - Security tier is immutable after initial set
 * - Default tier is CRITICAL (fail secure)
 */
export declare abstract class SecureBaseComponent extends HTMLElement {
    #private;
    /**
     * Constructor
     *
     * Security Note: Creates a CLOSED shadow DOM to prevent external JavaScript
     * from accessing or modifying the component's internal DOM.
     */
    constructor();
    /**
     * Observed attributes - must be overridden by child classes
     */
    static get observedAttributes(): string[];
    /**
     * Called when element is added to DOM
     */
    connectedCallback(): void;
    /**
     * Initialize security tier, config, and audit logging without triggering render.
     *
     * Components that manage their own rendering (e.g. secure-table) can call this
     * from their connectedCallback instead of super.connectedCallback() to get
     * security initialization without the base render lifecycle.
     * @protected
     */
    protected initializeSecurity(): void;
    /**
     * Called when an observed attribute changes
     *
     * Security Note: security-tier attribute is immutable after initialization
     * to prevent privilege escalation.
     */
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    /**
     * Handle attribute changes - to be overridden by child classes
     */
    protected handleAttributeChange(_name: string, _oldValue: string | null, _newValue: string | null): void;
    /**
     * Get base CSS styles shared by all components.
     *
     * Components that manage their own rendering can call this to include
     * base styles in their own <style> tag or adoptedStyleSheets.
     * @protected
     */
    protected getBaseStyles(): string;
    /**
     * Register additional component styles via adoptedStyleSheets (CSP-compliant).
     */
    protected addComponentStyles(cssText: string): void;
    /**
     * Render method to be implemented by child classes
     */
    protected abstract render(): DocumentFragment | HTMLElement | null;
    /**
     * Sanitize a string value to prevent XSS
     */
    protected sanitizeValue(value: string): string;
    /**
     * Validate input against tier-specific rules
     */
    protected validateInput(value: string, options?: ValidationOptions): ValidationResult;
    /**
     * Check rate limit for this component
     */
    protected checkRateLimit(): RateLimitResult;
    /**
     * Get the shadow root (protected access for child classes)
     */
    get shadowRoot(): ShadowRoot;
    /**
     * Get the current security tier
     */
    get securityTier(): SecurityTierValue;
    /**
     * Get the tier configuration
     */
    get config(): TierConfig;
    /**
     * Get all audit log entries
     */
    getAuditLog(): AuditLogEntry[];
    /**
     * Clear the local audit log
     */
    clearAuditLog(): void;
    /**
     * Trigger an audit event from child classes
     */
    protected audit(event: string, data: Record<string, unknown>): void;
    /**
     * Force re-render of the component
     */
    protected rerender(): void;
    /**
     * Clean up when component is removed from DOM
     */
    disconnectedCallback(): void;
}
export default SecureBaseComponent;
//# sourceMappingURL=base-component.d.ts.map