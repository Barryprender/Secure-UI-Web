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
import { SecurityTier } from '../../core/security-config.js';
/**
 * Secure File Upload Web Component
 *
 * Provides a security-hardened file upload field with progressive enhancement.
 * The component works as a standard file input without JavaScript and
 * enhances with security features when JavaScript is available.
 *
 * @extends SecureBaseComponent
 */
export class SecureFileUpload extends SecureBaseComponent {
    /**
     * File input element reference
     * @private
     */
    #fileInput = null;
    /**
     * Label element reference
     * @private
     */
    #labelElement = null;
    /**
     * Error container element reference
     * @private
     */
    #errorContainer = null;
    /**
     * File preview container
     * @private
     */
    #previewContainer = null;
    /**
     * Drop zone element
     * @private
     */
    #dropZone = null;
    /**
     * File name display element
     * @private
     */
    #fileNameDisplay = null;
    /**
     * Selected files
     * @private
     */
    #selectedFiles = null;
    /**
     * Unique ID for this file upload instance
     * @private
     */
    #instanceId = `secure-file-upload-${Math.random().toString(36).substr(2, 9)}`;
    /**
     * Allowed MIME types
     * @private
     */
    #allowedTypes = new Set();
    /**
     * Maximum file size in bytes
     * @private
     */
    #maxSize = 5 * 1024 * 1024; // Default 5MB
    /**
     * Optional scan hook for server-side file scanning (e.g. malware detection)
     * @private
     */
    #scanHook = null;
    /**
     * Whether a scan is currently in progress
     * @private
     */
    #scanning = false;
    /**
     * Observed attributes for this component
     *
     * @static
     */
    static get observedAttributes() {
        return [
            ...super.observedAttributes,
            'name',
            'label',
            'accept',
            'max-size',
            'multiple',
            'required',
            'capture'
        ];
    }
    /**
     * Constructor
     */
    constructor() {
        super();
    }
    /**
     * Render the file upload component
     *
     * Security Note: We use a native <input type="file"> element wrapped in our
     * web component to ensure progressive enhancement. The native input works
     * without JavaScript, and we enhance it with security features when JS is available.
     *
     * @protected
     */
    render() {
        const fragment = document.createDocumentFragment();
        const config = this.config;
        // Create container
        const container = document.createElement('div');
        container.className = 'file-upload-container';
        // Create label
        const label = this.getAttribute('label');
        if (label) {
            this.#labelElement = document.createElement('label');
            this.#labelElement.htmlFor = this.#instanceId;
            this.#labelElement.textContent = this.sanitizeValue(label);
            // Add security tier suffix if configured
            if (config.ui.labelSuffix) {
                const suffix = document.createElement('span');
                suffix.className = 'label-suffix';
                suffix.textContent = config.ui.labelSuffix;
                this.#labelElement.appendChild(suffix);
            }
            // Add security badge if configured
            if (config.ui.showSecurityBadge) {
                const badge = document.createElement('span');
                badge.className = 'security-badge';
                badge.textContent = config.name;
                this.#labelElement.appendChild(badge);
            }
            container.appendChild(this.#labelElement);
        }
        // Create drop zone
        this.#dropZone = document.createElement('div');
        this.#dropZone.className = 'drop-zone';
        // Create the file input element
        this.#fileInput = document.createElement('input');
        this.#fileInput.type = 'file';
        this.#fileInput.id = this.#instanceId;
        this.#fileInput.className = 'file-input';
        // Apply attributes
        this.#applyFileInputAttributes();
        // Set up event listeners
        this.#attachEventListeners();
        // Create Bulma-style drop zone content
        const dropZoneContent = document.createElement('div');
        dropZoneContent.className = 'drop-zone-content has-name';
        // Call-to-action button
        const fileCta = document.createElement('span');
        fileCta.className = 'file-cta';
        const dropIcon = document.createElement('span');
        dropIcon.className = 'drop-icon';
        dropIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
        fileCta.appendChild(dropIcon);
        const dropText = document.createElement('span');
        dropText.className = 'drop-text';
        dropText.textContent = 'Choose a file\u2026';
        fileCta.appendChild(dropText);
        dropZoneContent.appendChild(fileCta);
        // Filename display area
        this.#fileNameDisplay = document.createElement('span');
        this.#fileNameDisplay.className = 'file-name-display';
        this.#fileNameDisplay.textContent = 'No file selected';
        dropZoneContent.appendChild(this.#fileNameDisplay);
        this.#dropZone.appendChild(this.#fileInput);
        this.#dropZone.appendChild(dropZoneContent);
        container.appendChild(this.#dropZone);
        // Accepted types hint (below the input)
        const dropHint = document.createElement('div');
        dropHint.className = 'drop-hint';
        dropHint.textContent = this.#getAcceptHint();
        container.appendChild(dropHint);
        // Create preview container
        this.#previewContainer = document.createElement('div');
        this.#previewContainer.className = 'preview-container';
        container.appendChild(this.#previewContainer);
        // Create error container
        this.#errorContainer = document.createElement('div');
        this.#errorContainer.className = 'error-container hidden';
        this.#errorContainer.setAttribute('role', 'alert');
        this.#errorContainer.setAttribute('aria-live', 'polite');
        container.appendChild(this.#errorContainer);
        // Add component styles (CSP-compliant via adoptedStyleSheets)
        this.addComponentStyles(this.#getComponentStyles());
        fragment.appendChild(container);
        return fragment;
    }
    /**
     * Apply attributes to the file input
     *
     * @private
     */
    #applyFileInputAttributes() {
        const config = this.config;
        // Name attribute
        const name = this.getAttribute('name');
        if (name) {
            this.#fileInput.name = this.sanitizeValue(name);
        }
        // Accept attribute (file types)
        const accept = this.getAttribute('accept');
        if (accept) {
            this.#fileInput.accept = accept;
            this.#parseAcceptTypes(accept);
        }
        else {
            // Default safe file types based on tier
            const defaultAccept = this.#getDefaultAcceptTypes();
            this.#fileInput.accept = defaultAccept;
            this.#parseAcceptTypes(defaultAccept);
        }
        // Max size
        const maxSize = this.getAttribute('max-size');
        if (maxSize) {
            this.#maxSize = parseInt(maxSize, 10);
        }
        else {
            // Default max size based on tier
            this.#maxSize = this.#getDefaultMaxSize();
        }
        // Multiple files
        if (this.hasAttribute('multiple')) {
            this.#fileInput.multiple = true;
        }
        // Required
        if (this.hasAttribute('required') || config.validation.required) {
            this.#fileInput.required = true;
        }
        // Capture (for mobile camera)
        const capture = this.getAttribute('capture');
        if (capture) {
            this.#fileInput.capture = capture;
        }
        // Disabled
        if (this.hasAttribute('disabled')) {
            this.#fileInput.disabled = true;
        }
    }
    /**
     * Parse accept attribute to extract MIME types
     *
     * @private
     */
    #parseAcceptTypes(accept) {
        this.#allowedTypes.clear();
        const types = accept.split(',').map(t => t.trim());
        types.forEach((type) => {
            if (type.startsWith('.')) {
                // File extension - convert to MIME type
                const mimeType = this.#extensionToMimeType(type);
                if (mimeType) {
                    this.#allowedTypes.add(mimeType);
                }
            }
            else {
                // MIME type
                this.#allowedTypes.add(type);
            }
        });
    }
    /**
     * Convert file extension to MIME type
     *
     * @private
     */
    #extensionToMimeType(extension) {
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.zip': 'application/zip',
            '.json': 'application/json'
        };
        return mimeTypes[extension.toLowerCase()] || null;
    }
    /**
     * Get default accept types based on security tier
     *
     * @private
     */
    #getDefaultAcceptTypes() {
        switch (this.securityTier) {
            case SecurityTier.CRITICAL:
                // Most restrictive - only documents
                return '.pdf,.txt';
            case SecurityTier.SENSITIVE:
                // Documents and images
                return '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';
            case SecurityTier.AUTHENTICATED:
                // Common safe file types
                return '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif';
            case SecurityTier.PUBLIC:
            default:
                // All common file types
                return '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.zip';
        }
    }
    /**
     * Get default max size based on security tier
     *
     * @private
     */
    #getDefaultMaxSize() {
        switch (this.securityTier) {
            case SecurityTier.CRITICAL:
                return 2 * 1024 * 1024; // 2MB
            case SecurityTier.SENSITIVE:
                return 5 * 1024 * 1024; // 5MB
            case SecurityTier.AUTHENTICATED:
                return 10 * 1024 * 1024; // 10MB
            case SecurityTier.PUBLIC:
            default:
                return 20 * 1024 * 1024; // 20MB
        }
    }
    /**
     * Get accept hint text
     *
     * @private
     */
    #getAcceptHint() {
        const maxSizeMB = (this.#maxSize / (1024 * 1024)).toFixed(1);
        const accept = this.#fileInput.accept;
        return `Accepted: ${accept || 'all files'} (max ${maxSizeMB}MB)`;
    }
    /**
     * Attach event listeners
     *
     * @private
     */
    #attachEventListeners() {
        // File input change
        this.#fileInput.addEventListener('change', (e) => {
            this.#handleFileSelect(e);
        });
        // Drag and drop events
        this.#dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.#dropZone.classList.add('drag-over');
        });
        this.#dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.#dropZone.classList.remove('drag-over');
        });
        this.#dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.#dropZone.classList.remove('drag-over');
            const dragEvent = e;
            const files = dragEvent.dataTransfer.files;
            if (files.length > 0) {
                this.#fileInput.files = files;
                this.#handleFileSelect({ target: this.#fileInput });
            }
        });
    }
    /**
     * Handle file selection
     *
     * Security Note: This is where we perform comprehensive file validation
     * including type checking, size limits, and content validation.
     *
     * @private
     */
    async #handleFileSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }
        // Check rate limit
        const rateLimitCheck = this.checkRateLimit();
        if (!rateLimitCheck.allowed) {
            this.#showError(`Too many upload attempts. Please wait ${Math.ceil(rateLimitCheck.retryAfter / 1000)} seconds.`);
            this.#fileInput.value = '';
            return;
        }
        // Clear previous errors
        this.#clearErrors();
        // Validate all files
        const validation = await this.#validateFiles(files);
        if (!validation.valid) {
            this.#showError(validation.errors.join(', '));
            this.#fileInput.value = '';
            this.#selectedFiles = null;
            return;
        }
        // Store selected files
        this.#selectedFiles = files;
        // Update filename display
        this.#updateFileNameDisplay(files);
        // Show preview
        this.#showPreview(files);
        // Audit log
        this.audit('files_selected', {
            name: this.#fileInput.name,
            fileCount: files.length,
            totalSize: Array.from(files).reduce((sum, f) => sum + f.size, 0)
        });
        // Dispatch custom event
        this.dispatchEvent(new CustomEvent('secure-file-upload', {
            detail: {
                name: this.#fileInput.name,
                files: Array.from(files),
                tier: this.securityTier
            },
            bubbles: true,
            composed: true
        }));
    }
    /**
     * Validate selected files
     *
     * Security Note: Multi-layered validation including type, size, and content checks.
     *
     * @private
     */
    async #validateFiles(files) {
        const errors = [];
        // Check file count
        if (!this.#fileInput.multiple && files.length > 1) {
            errors.push('Only one file is allowed');
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // Validate file size
            if (file.size > this.#maxSize) {
                const maxSizeMB = (this.#maxSize / (1024 * 1024)).toFixed(1);
                errors.push(`${file.name}: File size exceeds ${maxSizeMB}MB`);
                continue;
            }
            // Validate file type
            if (this.#allowedTypes.size > 0) {
                const isAllowed = this.#isFileTypeAllowed(file);
                if (!isAllowed) {
                    errors.push(`${file.name}: File type not allowed`);
                    continue;
                }
            }
            // Validate file name (prevent path traversal)
            if (this.#isFileNameDangerous(file.name)) {
                errors.push(`${file.name}: Invalid file name`);
                continue;
            }
            // Content validation for critical tier
            if (this.securityTier === SecurityTier.CRITICAL) {
                const contentCheck = await this.#validateFileContent(file);
                if (!contentCheck.valid) {
                    errors.push(`${file.name}: ${contentCheck.error}`);
                    continue;
                }
            }
            // Run scan hook if registered
            if (this.#scanHook) {
                const scanResult = await this.#runScanHook(file);
                if (!scanResult.valid) {
                    errors.push(`${file.name}: ${scanResult.reason || 'Rejected by scan'}`);
                    continue;
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Check if file type is allowed
     *
     * @private
     */
    #isFileTypeAllowed(file) {
        // Check MIME type
        if (this.#allowedTypes.has(file.type)) {
            return true;
        }
        // Check wildcard patterns (e.g., image/*)
        for (const allowedType of this.#allowedTypes) {
            if (allowedType.endsWith('/*')) {
                const prefix = allowedType.slice(0, -2);
                if (file.type.startsWith(prefix)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if file name is dangerous
     *
     * Security Note: Prevent path traversal and dangerous file names
     *
     * @private
     */
    #isFileNameDangerous(fileName) {
        // Check for path traversal attempts
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            return true;
        }
        // Check for dangerous file names
        const dangerousNames = ['web.config', '.htaccess', '.env', 'config.php'];
        if (dangerousNames.includes(fileName.toLowerCase())) {
            return true;
        }
        return false;
    }
    /**
     * Run the registered scan hook on a file.
     *
     * Shows a scanning indicator, calls the hook, audits the result, and
     * handles errors gracefully (a hook that throws rejects the file).
     *
     * @private
     */
    async #runScanHook(file) {
        this.#scanning = true;
        this.#showScanningState(file.name);
        this.audit('scan_started', {
            name: this.#fileInput?.name ?? '',
            fileName: file.name,
            fileSize: file.size
        });
        try {
            const result = await this.#scanHook(file);
            this.audit(result.valid ? 'scan_passed' : 'scan_rejected', {
                name: this.#fileInput?.name ?? '',
                fileName: file.name,
                reason: result.reason ?? ''
            });
            return result;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Scan failed';
            this.audit('scan_error', {
                name: this.#fileInput?.name ?? '',
                fileName: file.name,
                error: message
            });
            return { valid: false, reason: `Scan error: ${message}` };
        }
        finally {
            this.#scanning = false;
            this.#hideScanningState();
        }
    }
    /**
     * Show a scanning-in-progress indicator on the drop zone
     *
     * @private
     */
    #showScanningState(fileName) {
        if (this.#dropZone) {
            this.#dropZone.classList.add('scanning');
        }
        if (this.#fileInput) {
            this.#fileInput.disabled = true;
        }
        if (this.#fileNameDisplay) {
            this.#fileNameDisplay.textContent = `Scanning ${fileName}\u2026`;
        }
    }
    /**
     * Remove the scanning indicator
     *
     * @private
     */
    #hideScanningState() {
        if (this.#dropZone) {
            this.#dropZone.classList.remove('scanning');
        }
        if (this.#fileInput && !this.hasAttribute('disabled')) {
            this.#fileInput.disabled = false;
        }
    }
    /**
     * Validate file content
     *
     * Security Note: Basic content validation — checks magic numbers to verify
     * the file content matches its declared MIME type.
     *
     * @private
     */
    async #validateFileContent(file) {
        try {
            // Read first few bytes to check magic numbers
            const buffer = await file.slice(0, 4).arrayBuffer();
            const bytes = new Uint8Array(buffer);
            // Basic magic number validation for common types
            const magicNumbers = {
                'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
                'image/jpeg': [0xFF, 0xD8, 0xFF],
                'image/png': [0x89, 0x50, 0x4E, 0x47]
            };
            // If we have magic numbers for this type, validate them
            if (magicNumbers[file.type]) {
                const expected = magicNumbers[file.type];
                const matches = expected.every((byte, i) => bytes[i] === byte);
                if (!matches) {
                    return {
                        valid: false,
                        error: 'File content does not match declared type'
                    };
                }
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: 'Failed to validate file content'
            };
        }
    }
    /**
     * Update the filename display area
     *
     * @private
     */
    #updateFileNameDisplay(files) {
        if (!this.#fileNameDisplay)
            return;
        if (!files || files.length === 0) {
            this.#fileNameDisplay.textContent = 'No file selected';
            this.#fileNameDisplay.classList.remove('has-file');
        }
        else if (files.length === 1) {
            this.#fileNameDisplay.textContent = files[0].name;
            this.#fileNameDisplay.classList.add('has-file');
        }
        else {
            this.#fileNameDisplay.textContent = `${files.length} files selected`;
            this.#fileNameDisplay.classList.add('has-file');
        }
    }
    /**
     * Show file preview
     *
     * @private
     */
    #showPreview(files) {
        this.#previewContainer.innerHTML = '';
        Array.from(files).forEach((file) => {
            const preview = document.createElement('div');
            preview.className = 'file-preview';
            const fileName = document.createElement('div');
            fileName.className = 'file-name';
            fileName.textContent = file.name;
            const fileSize = document.createElement('div');
            fileSize.className = 'file-size';
            fileSize.textContent = this.#formatFileSize(file.size);
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-file';
            removeBtn.textContent = '\u2715';
            removeBtn.type = 'button';
            removeBtn.onclick = () => {
                this.#removeFile();
            };
            preview.appendChild(fileName);
            preview.appendChild(fileSize);
            preview.appendChild(removeBtn);
            this.#previewContainer.appendChild(preview);
        });
    }
    /**
     * Format file size for display
     *
     * @private
     */
    #formatFileSize(bytes) {
        if (bytes < 1024)
            return bytes + ' B';
        if (bytes < 1024 * 1024)
            return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    /**
     * Remove selected file
     *
     * @private
     */
    #removeFile() {
        this.#fileInput.value = '';
        this.#selectedFiles = null;
        this.#previewContainer.innerHTML = '';
        this.#updateFileNameDisplay(null);
        this.#clearErrors();
        this.audit('file_removed', {
            name: this.#fileInput.name
        });
    }
    /**
     * Show error message
     *
     * @private
     */
    #showError(message) {
        this.#errorContainer.textContent = message;
        this.#errorContainer.classList.remove('hidden');
        this.#dropZone.classList.add('error');
    }
    /**
     * Clear error messages
     *
     * @private
     */
    #clearErrors() {
        this.#errorContainer.textContent = '';
        this.#errorContainer.classList.add('hidden');
        this.#dropZone.classList.remove('error');
    }
    /**
     * Get component-specific styles
     *
     * This returns a placeholder that will be replaced by the css-inliner build script
     * with the actual CSS from secure-file-upload.css using design tokens.
     *
     * @private
     */
    /**
   * Get component styles
   * @private
   * @returns {string} Component CSS
   */
  #getComponentStyles() {
    return `.file-upload-container{position:relative;margin-bottom:var(--secure-ui-form-gap);font-family:var(--secure-ui-font-family-base)}label{display:block;margin-bottom:var(--secure-ui-form-label-margin-bottom);font-size:var(--secure-ui-label-font-size);font-weight:var(--secure-ui-label-font-weight);color:var(--secure-ui-label-color)}.label-suffix{font-weight:var(--secure-ui-font-weight-normal);color:var(--secure-ui-color-text-secondary);font-size:var(--secure-ui-font-size-xs);margin-left:var(--secure-ui-space-1)}.security-badge{display:inline-block;padding:var(--secure-ui-badge-padding);margin-left:var(--secure-ui-space-2);font-size:var(--secure-ui-badge-font-size);font-weight:var(--secure-ui-font-weight-semibold);border-radius:var(--secure-ui-badge-border-radius);text-transform:uppercase;background-color:var(--secure-ui-color-bg-tertiary);color:var(--secure-ui-color-text-secondary);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border)}.drop-zone{position:relative;display:inline-flex;align-items:stretch;justify-content:flex-start;border-radius:var(--secure-ui-input-border-radius);cursor:pointer;width:100%}.drop-zone.drag-over{transform:scale(1.01)}.drop-zone.error .file-cta{border-color:var(--secure-ui-color-error);color:var(--secure-ui-color-error)}.file-input{position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:1}.drop-zone-content{display:flex;align-items:stretch;width:100%;pointer-events:none}.file-cta{display:flex;align-items:center;justify-content:center;padding:var(--secure-ui-input-padding-y) var(--secure-ui-input-padding-x);background-color:var(--secure-ui-color-bg-secondary);border:var(--secure-ui-input-border-width) solid var(--secure-ui-input-border-color);border-radius:var(--secure-ui-input-border-radius);color:var(--secure-ui-color-text-primary);font-size:var(--secure-ui-input-font-size);font-weight:var(--secure-ui-font-weight-medium);white-space:nowrap;transition:all var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out)}.drop-zone:hover .file-cta{background-color:var(--secure-ui-color-bg-tertiary);border-color:var(--secure-ui-input-border-color-hover)}.drop-zone:active .file-cta{background-color:var(--secure-ui-color-bg-tertiary)}.drop-zone.drag-over .file-cta{background-color:var(--secure-ui-color-primary-light,rgba(102,126,234,0.1));border-color:var(--secure-ui-color-primary);color:var(--secure-ui-color-primary)}.drop-icon{font-size:var(--secure-ui-font-size-base);margin-right:var(--secure-ui-space-2);display:flex;align-items:center}.drop-text{font-size:var(--secure-ui-font-size-base)}.file-name-display{display:flex;align-items:center;flex:1;padding:var(--secure-ui-input-padding-y) var(--secure-ui-input-padding-x);border:var(--secure-ui-input-border-width) solid var(--secure-ui-input-border-color);border-left:none;border-radius:0 var(--secure-ui-input-border-radius) var(--secure-ui-input-border-radius) 0;background-color:var(--secure-ui-input-bg);color:var(--secure-ui-input-placeholder-color);font-size:var(--secure-ui-input-font-size);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-name-display.has-file{color:var(--secure-ui-input-text-color)}.drop-zone-content.has-name .file-cta{border-radius:var(--secure-ui-input-border-radius) 0 0 var(--secure-ui-input-border-radius);border-right:none}.drop-hint{display:block;text-align:right;margin-top:var(--secure-ui-space-1);font-size:var(--secure-ui-font-size-xs);color:var(--secure-ui-color-text-secondary)}.preview-container{margin-top:var(--secure-ui-space-3)}.file-preview{display:flex;align-items:center;padding:var(--secure-ui-space-3);background-color:var(--secure-ui-color-bg-secondary);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);border-radius:var(--secure-ui-input-border-radius);margin-bottom:var(--secure-ui-space-2)}.file-name{flex:1;font-size:var(--secure-ui-font-size-sm);color:var(--secure-ui-color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-size{font-size:var(--secure-ui-font-size-xs);color:var(--secure-ui-color-text-secondary);margin-left:var(--secure-ui-space-3);white-space:nowrap}.remove-file{background:none;border:none;color:var(--secure-ui-color-error);font-size:var(--secure-ui-font-size-base);cursor:pointer;padding:var(--secure-ui-space-1) var(--secure-ui-space-2);margin-left:var(--secure-ui-space-2);border-radius:var(--secure-ui-border-radius-sm);transition:background-color var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out);pointer-events:auto}.remove-file:hover{background-color:var(--secure-ui-color-error-light,rgba(239,68,68,0.1))}.error-container{position:absolute;bottom:-1rem;left:0;display:var(--error-display);margin-top:var(--secure-ui-form-error-margin-top);padding:var(--secure-ui-space-2) var(--secure-ui-space-3);background-color:var(--secure-ui-color-error-light,rgba(239,68,68,0.1));border-radius:var(--secure-ui-border-radius-sm);color:var(--secure-ui-color-error);font-size:var(--secure-ui-error-font-size)}.error-container.hidden{max-height:0;opacity:0;transform:translateY(-4px);margin-top:0}.drop-zone.disabled{opacity:var(--secure-ui-input-disabled-opacity);cursor:not-allowed}.drop-zone.disabled .file-cta{background-color:var(--secure-ui-input-disabled-bg)}.drop-zone.scanning{pointer-events:none;opacity:0.7}.drop-zone.scanning .file-cta{border-color:var(--secure-ui-color-primary)}.drop-zone.scanning .file-name-display{color:var(--secure-ui-color-primary);animation:scanning-pulse 1.2s ease-in-out infinite}@keyframes scanning-pulse{0%,100%{opacity:0.5}50%{opacity:1}}`;
  }
    /**
     * Handle attribute changes
     *
     * @protected
     */
    handleAttributeChange(name, _oldValue, newValue) {
        if (!this.#fileInput)
            return;
        switch (name) {
            case 'disabled':
                this.#fileInput.disabled = this.hasAttribute('disabled');
                break;
            case 'accept':
                this.#fileInput.accept = newValue;
                this.#parseAcceptTypes(newValue);
                break;
        }
    }
    /**
     * Get selected files
     *
     * @public
     */
    get files() {
        return this.#selectedFiles;
    }
    /**
     * Get the input name
     *
     * @public
     */
    get name() {
        return this.#fileInput ? this.#fileInput.name : '';
    }
    /**
     * Check if the upload is valid
     *
     * @public
     */
    get valid() {
        const required = this.hasAttribute('required') || this.config.validation.required;
        if (required && (!this.#selectedFiles || this.#selectedFiles.length === 0)) {
            return false;
        }
        return true;
    }
    /**
     * Clear selected files
     *
     * @public
     */
    clear() {
        this.#removeFile();
    }
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
    setScanHook(hook) {
        if (typeof hook !== 'function') {
            throw new TypeError('setScanHook expects a function');
        }
        this.#scanHook = hook;
        this.audit('scan_hook_registered', {
            name: this.#fileInput?.name ?? ''
        });
    }
    /**
     * Check whether a scan hook is registered
     *
     * @public
     */
    get hasScanHook() {
        return this.#scanHook !== null;
    }
    /**
     * Check whether a scan is currently in progress
     *
     * @public
     */
    get scanning() {
        return this.#scanning;
    }
    /**
     * Cleanup on disconnect
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clear file references
        this.#selectedFiles = null;
        if (this.#fileInput) {
            this.#fileInput.value = '';
        }
    }
}
// Define the custom element
customElements.define('secure-file-upload', SecureFileUpload);
export default SecureFileUpload;
//# sourceMappingURL=secure-file-upload.js.map