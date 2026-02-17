/**
 * @fileoverview Security Configuration and Tier Definitions
 *
 * This module defines the four security tiers that govern all component behavior
 * in the Secure-UI library. Each tier represents a different level of data sensitivity
 * and applies corresponding security controls.
 *
 * Security Philosophy:
 * - Defense in depth: Multiple layers of protection at each tier
 * - Fail secure: Default to highest security when tier is ambiguous
 * - Progressive enhancement: All tiers work without JavaScript
 * - Zero trust: Always validate, never assume data is safe
 *
 * @module security-config
 * @license MIT
 */
/**
 * Security tier enumeration
 * These constants should be used throughout the library to reference security levels
 */
export const SecurityTier = Object.freeze({
    /** PUBLIC: Non-sensitive data (e.g., search queries, public comments) */
    PUBLIC: 'public',
    /** AUTHENTICATED: User-specific but non-sensitive data (e.g., display names, preferences) */
    AUTHENTICATED: 'authenticated',
    /** SENSITIVE: Personally identifiable information (e.g., email, phone, address) */
    SENSITIVE: 'sensitive',
    /** CRITICAL: High-risk data (e.g., passwords, SSN, payment info) */
    CRITICAL: 'critical'
});
/**
 * Default configuration for each security tier
 *
 * Security Note: These defaults implement defense-in-depth by progressively
 * adding security controls at each tier. When in doubt, components should
 * default to CRITICAL tier behavior.
 */
export const TIER_CONFIG = Object.freeze({
    [SecurityTier.PUBLIC]: Object.freeze({
        name: 'Public',
        level: 1,
        validation: Object.freeze({
            required: false,
            strict: false,
            maxLength: 5000,
            pattern: null,
            sanitizeHtml: true
        }),
        masking: Object.freeze({
            enabled: false,
            character: '•',
            partial: false
        }),
        storage: Object.freeze({
            allowAutocomplete: true,
            allowCache: true,
            allowHistory: true
        }),
        audit: Object.freeze({
            logAccess: false,
            logChanges: false,
            logSubmission: false,
            includeMetadata: false
        }),
        ui: Object.freeze({
            labelSuffix: '',
            showSecurityBadge: false
        }),
        rateLimit: Object.freeze({
            enabled: false,
            maxAttempts: 0,
            windowMs: 0
        })
    }),
    [SecurityTier.AUTHENTICATED]: Object.freeze({
        name: 'Authenticated',
        level: 2,
        validation: Object.freeze({
            required: true,
            strict: false,
            maxLength: 1000,
            pattern: null,
            sanitizeHtml: true
        }),
        masking: Object.freeze({
            enabled: false,
            character: '•',
            partial: false
        }),
        storage: Object.freeze({
            allowAutocomplete: true,
            allowCache: false,
            allowHistory: false
        }),
        audit: Object.freeze({
            logAccess: false,
            logChanges: true,
            logSubmission: true,
            includeMetadata: true
        }),
        ui: Object.freeze({
            labelSuffix: '',
            showSecurityBadge: true
        }),
        rateLimit: Object.freeze({
            enabled: false,
            maxAttempts: 0,
            windowMs: 0
        })
    }),
    [SecurityTier.SENSITIVE]: Object.freeze({
        name: 'Sensitive',
        level: 3,
        validation: Object.freeze({
            required: true,
            strict: true,
            maxLength: 500,
            pattern: null,
            sanitizeHtml: true
        }),
        masking: Object.freeze({
            enabled: false,
            character: '•',
            partial: true
        }),
        storage: Object.freeze({
            allowAutocomplete: false,
            allowCache: false,
            allowHistory: false
        }),
        audit: Object.freeze({
            logAccess: true,
            logChanges: true,
            logSubmission: true,
            includeMetadata: true
        }),
        ui: Object.freeze({
            labelSuffix: ' (Sensitive)',
            showSecurityBadge: true
        }),
        rateLimit: Object.freeze({
            enabled: true,
            maxAttempts: 10,
            windowMs: 60000
        })
    }),
    [SecurityTier.CRITICAL]: Object.freeze({
        name: 'Critical',
        level: 4,
        validation: Object.freeze({
            required: true,
            strict: true,
            maxLength: 256,
            pattern: null,
            sanitizeHtml: true
        }),
        masking: Object.freeze({
            enabled: true,
            character: '•',
            partial: false
        }),
        storage: Object.freeze({
            allowAutocomplete: false,
            allowCache: false,
            allowHistory: false
        }),
        audit: Object.freeze({
            logAccess: true,
            logChanges: true,
            logSubmission: true,
            includeMetadata: true
        }),
        ui: Object.freeze({
            labelSuffix: ' (Critical - Secure)',
            showSecurityBadge: true
        }),
        rateLimit: Object.freeze({
            enabled: true,
            maxAttempts: 5,
            windowMs: 60000
        })
    })
});
/**
 * Get configuration for a specific security tier
 *
 * Security Note: If an invalid tier is provided, this function fails secure
 * by returning the CRITICAL tier configuration.
 */
export function getTierConfig(tier) {
    if (!tier || !TIER_CONFIG[tier]) {
        console.warn(`Invalid security tier "${tier}", defaulting to CRITICAL`);
        return TIER_CONFIG[SecurityTier.CRITICAL];
    }
    return TIER_CONFIG[tier];
}
/**
 * Validate that a tier value is valid
 */
export function isValidTier(tier) {
    return Object.values(SecurityTier).includes(tier);
}
/**
 * Compare two security tiers
 *
 * @returns -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
 */
export function compareTiers(tier1, tier2) {
    const config1 = getTierConfig(tier1);
    const config2 = getTierConfig(tier2);
    return Math.sign(config1.level - config2.level);
}
/**
 * Get the more secure of two tiers
 */
export function getMoreSecureTier(tier1, tier2) {
    return compareTiers(tier1, tier2) >= 0 ? tier1 : tier2;
}
/**
 * Content Security Policy recommendations for each tier
 */
export const CSP_RECOMMENDATIONS = Object.freeze({
    [SecurityTier.PUBLIC]: Object.freeze({
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"]
    }),
    [SecurityTier.AUTHENTICATED]: Object.freeze({
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'form-action': ["'self'"]
    }),
    [SecurityTier.SENSITIVE]: Object.freeze({
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': []
    }),
    [SecurityTier.CRITICAL]: Object.freeze({
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
        'block-all-mixed-content': [],
        'base-uri': ["'none'"]
    })
});
/**
 * Default security headers recommendations
 */
export const SECURITY_HEADERS = Object.freeze({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
});
export default {
    SecurityTier,
    TIER_CONFIG,
    getTierConfig,
    isValidTier,
    compareTiers,
    getMoreSecureTier,
    CSP_RECOMMENDATIONS,
    SECURITY_HEADERS
};
//# sourceMappingURL=security-config.js.map