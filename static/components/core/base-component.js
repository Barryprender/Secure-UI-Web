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
import { SecurityTier, getTierConfig, isValidTier, } from './security-config.js';
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
export class SecureBaseComponent extends HTMLElement {
    #securityTier = SecurityTier.CRITICAL;
    #config;
    #shadow;
    #auditLog = [];
    #rateLimitState = {
        attempts: 0,
        windowStart: Date.now()
    };
    #initialized = false;
    /**
     * Constructor
     *
     * Security Note: Creates a CLOSED shadow DOM to prevent external JavaScript
     * from accessing or modifying the component's internal DOM.
     */
    constructor() {
        super();
        this.#shadow = this.attachShadow({ mode: 'closed' });
        this.#config = getTierConfig(this.#securityTier);
    }
    /**
     * Observed attributes - must be overridden by child classes
     */
    static get observedAttributes() {
        return ['security-tier', 'disabled', 'readonly'];
    }
    /**
     * Called when element is added to DOM
     */
    connectedCallback() {
        if (!this.#initialized) {
            this.#initialize();
            this.#initialized = true;
        }
    }
    #initialize() {
        this.initializeSecurity();
        this.#render();
    }
    /**
     * Initialize security tier, config, and audit logging without triggering render.
     *
     * Components that manage their own rendering (e.g. secure-table) can call this
     * from their connectedCallback instead of super.connectedCallback() to get
     * security initialization without the base render lifecycle.
     * @protected
     */
    initializeSecurity() {
        const tierAttr = this.getAttribute('security-tier');
        if (tierAttr && isValidTier(tierAttr)) {
            this.#securityTier = tierAttr;
        }
        this.#config = getTierConfig(this.#securityTier);
        this.#audit('component_initialized', {
            tier: this.#securityTier,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Called when an observed attribute changes
     *
     * Security Note: security-tier attribute is immutable after initialization
     * to prevent privilege escalation.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'security-tier' && this.#initialized) {
            console.warn(`Security tier cannot be changed after initialization. ` +
                `Attempted change from "${oldValue}" to "${newValue}" blocked.`);
            if (oldValue !== null) {
                this.setAttribute('security-tier', oldValue);
            }
            return;
        }
        if (this.#initialized) {
            this.handleAttributeChange(name, oldValue, newValue);
        }
    }
    /**
     * Handle attribute changes - to be overridden by child classes
     */
    handleAttributeChange(_name, _oldValue, _newValue) {
        // Child classes should override this method
    }
    #render() {
        this.#shadow.innerHTML = '';
        const baseSheet = new CSSStyleSheet();
        baseSheet.replaceSync(this.#getBaseStyles());
        this.#shadow.adoptedStyleSheets = [baseSheet];
        const content = this.render();
        if (content) {
            this.#shadow.appendChild(content);
        }
    }
    #getBaseStyles() {
        return this.getBaseStyles();
    }
    /**
     * Get base CSS styles shared by all components.
     *
     * Components that manage their own rendering can call this to include
     * base styles in their own <style> tag or adoptedStyleSheets.
     * @protected
     */
    getBaseStyles() {
        return `
      :host {
        display: block;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }

      :host([hidden]) {
        display: none;
      }

      * {
        box-sizing: border-box;
      }

      .hidden {
        display: none;
      }

      .security-badge {
        display: inline-block;
        padding: 2px 6px;
        margin-left: 8px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 3px;
        text-transform: uppercase;
        background-color: #f0f0f0;
        color: #666;
        border: 1px solid #ccc;
      }
    `;
    }
    /**
     * Register additional component styles via adoptedStyleSheets (CSP-compliant).
     */
    addComponentStyles(cssText) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        this.#shadow.adoptedStyleSheets = [...this.#shadow.adoptedStyleSheets, sheet];
    }
    /**
     * Sanitize a string value to prevent XSS
     */
    sanitizeValue(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }
    /**
     * Validate input against tier-specific rules
     */
    validateInput(value, options = {}) {
        const errors = [];
        const config = this.#config;
        if (config.validation.required && (!value || value.trim().length === 0)) {
            errors.push('This field is required');
        }
        const maxLength = options.maxLength || config.validation.maxLength;
        if (value && value.length > maxLength) {
            errors.push(`Value exceeds maximum length of ${maxLength}`);
        }
        const minLength = options.minLength || 0;
        if (value && value.length < minLength) {
            errors.push(`Value must be at least ${minLength} characters`);
        }
        const pattern = options.pattern || config.validation.pattern;
        if (pattern && value && !pattern.test(value)) {
            errors.push('Value does not match required format');
        }
        if (config.validation.strict && errors.length > 0) {
            this.#audit('validation_failed', {
                errors,
                valueLength: value ? value.length : 0
            });
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Check rate limit for this component
     */
    checkRateLimit() {
        if (!this.#config.rateLimit.enabled) {
            return { allowed: true, retryAfter: 0 };
        }
        const now = Date.now();
        const windowMs = this.#config.rateLimit.windowMs;
        if (now - this.#rateLimitState.windowStart > windowMs) {
            this.#rateLimitState.attempts = 0;
            this.#rateLimitState.windowStart = now;
        }
        if (this.#rateLimitState.attempts >= this.#config.rateLimit.maxAttempts) {
            const retryAfter = windowMs - (now - this.#rateLimitState.windowStart);
            this.#audit('rate_limit_exceeded', {
                attempts: this.#rateLimitState.attempts,
                retryAfter
            });
            return { allowed: false, retryAfter };
        }
        this.#rateLimitState.attempts++;
        return { allowed: true, retryAfter: 0 };
    }
    #audit(event, data = {}) {
        const config = this.#config.audit;
        const shouldLog = (event.includes('access') && config.logAccess) ||
            (event.includes('change') && config.logChanges) ||
            (event.includes('submit') && config.logSubmission) ||
            event.includes('initialized') ||
            event.includes('rate_limit') ||
            event.includes('validation');
        if (!shouldLog) {
            return;
        }
        const logEntry = {
            event,
            tier: this.#securityTier,
            timestamp: new Date().toISOString(),
            ...data
        };
        if (config.includeMetadata) {
            logEntry.userAgent = navigator.userAgent;
            logEntry.language = navigator.language;
        }
        this.#auditLog.push(logEntry);
        this.dispatchEvent(new CustomEvent('secure-audit', {
            detail: logEntry,
            bubbles: true,
            composed: true
        }));
    }
    /**
     * Get the shadow root (protected access for child classes)
     */
    get shadowRoot() {
        return this.#shadow;
    }
    /**
     * Get the current security tier
     */
    get securityTier() {
        return this.#securityTier;
    }
    /**
     * Get the tier configuration
     */
    get config() {
        return this.#config;
    }
    /**
     * Get all audit log entries
     */
    getAuditLog() {
        return [...this.#auditLog];
    }
    /**
     * Clear the local audit log
     */
    clearAuditLog() {
        this.#auditLog = [];
    }
    /**
     * Trigger an audit event from child classes
     */
    audit(event, data) {
        this.#audit(event, data);
    }
    /**
     * Force re-render of the component
     */
    rerender() {
        this.#render();
    }
    /**
     * Clean up when component is removed from DOM
     */
    disconnectedCallback() {
        this.#rateLimitState = { attempts: 0, windowStart: Date.now() };
        if (this.#config.audit.logAccess) {
            this.#audit('component_disconnected', {
                timestamp: new Date().toISOString()
            });
        }
    }
}
export default SecureBaseComponent;
//# sourceMappingURL=base-component.js.map