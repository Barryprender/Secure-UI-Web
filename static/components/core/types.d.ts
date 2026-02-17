/**
 * @fileoverview Shared type definitions for the Secure-UI component library.
 * @module types
 * @license MIT
 */
/**
 * Security tier string literal values
 */
export type SecurityTierValue = 'public' | 'authenticated' | 'sensitive' | 'critical';
/**
 * Validation configuration for a security tier
 */
export interface ValidationConfig {
    readonly required: boolean;
    readonly strict: boolean;
    readonly maxLength: number;
    readonly pattern: RegExp | null;
    readonly sanitizeHtml: boolean;
}
/**
 * Masking configuration for a security tier
 */
export interface MaskingConfig {
    readonly enabled: boolean;
    readonly character: string;
    readonly partial: boolean;
}
/**
 * Browser storage permissions for a security tier
 */
export interface StorageConfig {
    readonly allowAutocomplete: boolean;
    readonly allowCache: boolean;
    readonly allowHistory: boolean;
}
/**
 * Audit logging configuration for a security tier
 */
export interface AuditConfig {
    readonly logAccess: boolean;
    readonly logChanges: boolean;
    readonly logSubmission: boolean;
    readonly includeMetadata: boolean;
}
/**
 * UI configuration for a security tier
 */
export interface UIConfig {
    readonly labelSuffix: string;
    readonly showSecurityBadge: boolean;
}
/**
 * Rate limiting configuration for a security tier
 */
export interface RateLimitConfig {
    readonly enabled: boolean;
    readonly maxAttempts: number;
    readonly windowMs: number;
}
/**
 * Complete tier configuration object
 */
export interface TierConfig {
    readonly name: string;
    readonly level: number;
    readonly validation: ValidationConfig;
    readonly masking: MaskingConfig;
    readonly storage: StorageConfig;
    readonly audit: AuditConfig;
    readonly ui: UIConfig;
    readonly rateLimit: RateLimitConfig;
}
/**
 * Validation result returned by validateInput()
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validation options passed to validateInput()
 */
export interface ValidationOptions {
    pattern?: RegExp | null;
    minLength?: number;
    maxLength?: number;
}
/**
 * Rate limit check result
 */
export interface RateLimitResult {
    allowed: boolean;
    retryAfter: number;
}
/**
 * Rate limit state tracking
 */
export interface RateLimitState {
    attempts: number;
    windowStart: number;
}
/**
 * Audit log entry
 */
export interface AuditLogEntry {
    event: string;
    tier: SecurityTierValue;
    timestamp: string;
    userAgent?: string;
    language?: string;
    [key: string]: unknown;
}
/**
 * CSP directive mapping
 */
export type CSPDirectives = Record<string, string[]>;
/**
 * Security headers mapping
 */
export type SecurityHeaders = Record<string, string>;
/**
 * Custom event detail for secure-input events
 */
export interface SecureInputEventDetail {
    name: string;
    value: string;
    masked: boolean;
    tier: SecurityTierValue;
}
/**
 * Custom event detail for secure-textarea events
 */
export interface SecureTextareaEventDetail {
    name: string;
    value: string;
    tier: SecurityTierValue;
}
/**
 * Custom event detail for secure-select events
 */
export interface SecureSelectEventDetail {
    name: string;
    value: string;
    tier: SecurityTierValue;
}
/**
 * Custom event detail for secure-file-upload events
 */
export interface SecureFileUploadEventDetail {
    name: string;
    files: File[];
    tier: SecurityTierValue;
}
/**
 * Custom event detail for secure-datetime events
 */
export interface SecureDatetimeEventDetail {
    name: string;
    value: string;
    type: string;
    tier: SecurityTierValue;
}
/**
 * Custom event detail for secure-form-submit events
 */
export interface SecureFormSubmitEventDetail {
    formData: Record<string, string>;
    formElement: HTMLFormElement;
    preventDefault: () => void;
}
/**
 * Custom event detail for secure-form-success events
 */
export interface SecureFormSuccessEventDetail {
    formData: Record<string, string>;
    response: Response;
}
/**
 * Custom event detail for secure-audit events
 */
export interface SecureAuditEventDetail extends AuditLogEntry {
}
/**
 * Table column definition
 */
export interface TableColumnDefinition {
    key: string;
    label: string;
    sortable?: boolean;
    filterable?: boolean;
    tier?: SecurityTierValue;
    width?: string;
    render?: (value: unknown, row: Record<string, unknown>, columnKey: string) => string;
}
/**
 * Table sort configuration
 */
export interface TableSortConfig {
    column: string | null;
    direction: 'asc' | 'desc';
}
/**
 * Table pagination state
 */
export interface TablePaginationState {
    currentPage: number;
    pageSize: number;
}
/**
 * Valid datetime input types
 */
export type DateTimeInputType = 'date' | 'time' | 'datetime-local' | 'month' | 'week';
//# sourceMappingURL=types.d.ts.map