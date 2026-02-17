/**
 * @fileoverview Secure File Upload Component
 *
 * A security-first file upload component that implements progressive enhancement,
 * file type validation, size limits, scan hook integration, and audit logging.
 *
 * Progressive Enhancement Strategy:
 * 1. Without JavaScript: Falls back to native HTML5 file input
 * 2. With JavaScript: Enhances with validation, preview, drag-drop, security checks
 *
 * Usage:
 * <secure-file-upload
 *   security-tier="sensitive"
 *   name="document"
 *   label="Upload Document"
 *   accept=".pdf,.doc,.docx"
 *   max-size="5242880"
 *   required
 * ></secure-file-upload>
 *
 * Security Features:
 * - File type validation (MIME type and extension)
 * - File size limits based on security tier
 * - Scan hook integration (e.g. server-side malware scanning)
 * - Content validation before upload
 * - Rate limiting on uploads
 * - Comprehensive audit logging
 * - Drag-and-drop with validation
 * - Preview for safe file types
 *
 * @module secure-file-upload
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
/**
 * Result returned by a scan hook function.
 */
export interface ScanHookResult {
    /** Whether the file passed the scan */
    valid: boolean;
    /** Reason for rejection (when valid is false) */
    reason?: string;
}
/**
 * A function that scans a file and returns a pass/fail result.
 * Typically sends the file to a server-side scanning endpoint.
 */
export type ScanHookFn = (file: File) => Promise<ScanHookResult>;
/**
 * Secure File Upload Web Component
 *
 * Provides a security-hardened file upload field with progressive enhancement.
 * The component works as a standard file input without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export declare class SecureFileUpload extends SecureBaseComponent {
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
     * Render the file upload component
     *
     * Security Note: We use a native <input type="file"> element wrapped in our
     * web component to ensure progressive enhancement. The native input works
     * without JavaScript, and we enhance it with security features when JS is available.
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
     * Get selected files
     *
     * @public
     */
    get files(): FileList | null;
    /**
     * Get the input name
     *
     * @public
     */
    get name(): string;
    /**
     * Check if the upload is valid
     *
     * @public
     */
    get valid(): boolean;
    /**
     * Clear selected files
     *
     * @public
     */
    clear(): void;
    /**
     * Register a scan hook function for server-side file scanning.
     *
     * The hook receives each selected file and must return a Promise that
     * resolves to `{ valid: boolean; reason?: string }`. When `valid` is
     * false the file is rejected and the reason is shown to the user.
     *
     * @example
     * ```js
     * const upload = document.querySelector('secure-file-upload');
     * upload.setScanHook(async (file) => {
     *   const form = new FormData();
     *   form.append('file', file);
     *   const res = await fetch('/api/scan', { method: 'POST', body: form });
     *   const { clean, threat } = await res.json();
     *   return { valid: clean, reason: threat };
     * });
     * ```
     *
     * @public
     */
    setScanHook(hook: ScanHookFn): void;
    /**
     * Check whether a scan hook is registered
     *
     * @public
     */
    get hasScanHook(): boolean;
    /**
     * Check whether a scan is currently in progress
     *
     * @public
     */
    get scanning(): boolean;
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback(): void;
}
export default SecureFileUpload;
//# sourceMappingURL=secure-file-upload.d.ts.map