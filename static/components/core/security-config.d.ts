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
import type { SecurityTierValue, TierConfig, CSPDirectives, SecurityHeaders } from './types.js';
/**
 * Security tier enumeration
 * These constants should be used throughout the library to reference security levels
 */
export declare const SecurityTier: Readonly<{
    /** PUBLIC: Non-sensitive data (e.g., search queries, public comments) */
    PUBLIC: "public";
    /** AUTHENTICATED: User-specific but non-sensitive data (e.g., display names, preferences) */
    AUTHENTICATED: "authenticated";
    /** SENSITIVE: Personally identifiable information (e.g., email, phone, address) */
    SENSITIVE: "sensitive";
    /** CRITICAL: High-risk data (e.g., passwords, SSN, payment info) */
    CRITICAL: "critical";
}>;
/**
 * Default configuration for each security tier
 *
 * Security Note: These defaults implement defense-in-depth by progressively
 * adding security controls at each tier. When in doubt, components should
 * default to CRITICAL tier behavior.
 */
export declare const TIER_CONFIG: Readonly<Record<SecurityTierValue, TierConfig>>;
/**
 * Get configuration for a specific security tier
 *
 * Security Note: If an invalid tier is provided, this function fails secure
 * by returning the CRITICAL tier configuration.
 */
export declare function getTierConfig(tier: string): TierConfig;
/**
 * Validate that a tier value is valid
 */
export declare function isValidTier(tier: string): tier is SecurityTierValue;
/**
 * Compare two security tiers
 *
 * @returns -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
 */
export declare function compareTiers(tier1: string, tier2: string): number;
/**
 * Get the more secure of two tiers
 */
export declare function getMoreSecureTier(tier1: string, tier2: string): string;
/**
 * Content Security Policy recommendations for each tier
 */
export declare const CSP_RECOMMENDATIONS: Readonly<Record<SecurityTierValue, Readonly<CSPDirectives>>>;
/**
 * Default security headers recommendations
 */
export declare const SECURITY_HEADERS: Readonly<SecurityHeaders>;
declare const _default: {
    SecurityTier: Readonly<{
        /** PUBLIC: Non-sensitive data (e.g., search queries, public comments) */
        PUBLIC: "public";
        /** AUTHENTICATED: User-specific but non-sensitive data (e.g., display names, preferences) */
        AUTHENTICATED: "authenticated";
        /** SENSITIVE: Personally identifiable information (e.g., email, phone, address) */
        SENSITIVE: "sensitive";
        /** CRITICAL: High-risk data (e.g., passwords, SSN, payment info) */
        CRITICAL: "critical";
    }>;
    TIER_CONFIG: Readonly<Record<SecurityTierValue, TierConfig>>;
    getTierConfig: typeof getTierConfig;
    isValidTier: typeof isValidTier;
    compareTiers: typeof compareTiers;
    getMoreSecureTier: typeof getMoreSecureTier;
    CSP_RECOMMENDATIONS: Readonly<Record<SecurityTierValue, Readonly<CSPDirectives>>>;
    SECURITY_HEADERS: Readonly<SecurityHeaders>;
};
export default _default;
//# sourceMappingURL=security-config.d.ts.map