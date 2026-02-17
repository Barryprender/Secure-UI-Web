/**
 * Secure Table Component
 *
 * A security-aware data table component with filtering, sorting, and pagination.
 *
 * Features:
 * - Real-time filtering/search across all columns
 * - Column sorting (ascending/descending)
 * - Pagination
 * - Security tier-based column masking
 * - XSS prevention via sanitization
 * - Audit logging for data access
 *
 * @example
 * <secure-table
 *   id="userTable"
 *   security-tier="sensitive"
 * ></secure-table>
 *
 * // Set data programmatically
 * const table = document.getElementById('userTable');
 * table.data = [
 *   { id: 1, name: 'John', email: 'john@example.com' },
 *   { id: 2, name: 'Jane', email: 'jane@example.com' }
 * ];
 * table.columns = [
 *   { key: 'id', label: 'ID', sortable: true },
 *   { key: 'name', label: 'Name', sortable: true, filterable: true },
 *   { key: 'email', label: 'Email', sortable: true, filterable: true, tier: 'sensitive' }
 * ];
 */
import { SecureBaseComponent } from '../../core/base-component.js';
import { SecurityTier } from '../../core/security-config.js';
export class SecureTable extends SecureBaseComponent {
    /**
     * Data array for the table
     * @private
     */
    #data = [];
    /**
     * Column configuration
     * @private
     */
    #columns = [];
    /**
     * Filtered data after applying search
     * @private
     */
    #filteredData = [];
    /**
     * Current filter/search term
     * @private
     */
    #filterTerm = '';
    /**
     * Current sort configuration
     * @private
     */
    #sortConfig = { column: null, direction: 'asc' };
    /**
     * Pagination state
     * @private
     */
    #pagination = { currentPage: 1, pageSize: 10 };
    /**
     * Shadow DOM root
     * @private
     */
    #shadow;
    /**
     * Whether the component is using slotted server-rendered content
     * @private
     */
    #usingSlottedContent = false;
    constructor() {
        super();
        this.#shadow = this.shadowRoot;
    }
    /**
     * Required by abstract base class, but this component manages its own rendering
     * via the private #render() method.
     * @protected
     */
    render() {
        return null;
    }
    /**
     * Component lifecycle - called when added to DOM
     */
    connectedCallback() {
        // Initialize security tier, config, and audit - but skip the base render
        // lifecycle since the table manages its own innerHTML-based rendering for
        // dynamic sort/filter/pagination updates.
        this.initializeSecurity();
        // Try to parse server-rendered content first (progressive enhancement)
        const slottedTable = this.querySelector('table[slot="table"]');
        const parsed = this.#parseSlottedTable();
        if (parsed) {
            console.log('SecureTable: Using server-rendered content', {
                columns: parsed.columns.length,
                rows: parsed.data.length
            });
            this.#usingSlottedContent = true;
            this.#columns = parsed.columns;
            this.#data = parsed.data;
            this.#filteredData = [...parsed.data];
            // Remove the server-rendered table from light DOM now that data is extracted
            if (slottedTable) {
                slottedTable.remove();
            }
        }
        this.#render();
        this.audit('table_mounted', {
            rowCount: this.#data.length,
            columnCount: this.#columns.length,
            usingSlottedContent: this.#usingSlottedContent
        });
    }
    /**
     * Parse server-rendered table from light DOM slot
     * @private
     */
    #parseSlottedTable() {
        const slottedTable = this.querySelector('table[slot="table"]');
        if (!slottedTable)
            return null;
        try {
            // Extract columns from <thead>
            const headers = slottedTable.querySelectorAll('thead th');
            if (headers.length === 0)
                return null;
            const columns = Array.from(headers).map(th => {
                const key = th.getAttribute('data-key') || th.textContent.trim().toLowerCase().replace(/\s+/g, '_');
                return {
                    key: key,
                    label: th.textContent.trim().replace(/\s+$/, ''), // Remove trailing spaces/badges
                    sortable: th.hasAttribute('data-sortable') ? th.getAttribute('data-sortable') !== 'false' : true,
                    filterable: th.hasAttribute('data-filterable') ? th.getAttribute('data-filterable') !== 'false' : undefined,
                    tier: (th.getAttribute('data-tier') || undefined),
                    width: th.getAttribute('data-width') || undefined,
                    render: th.hasAttribute('data-render-html') ? this.#createRenderFunction(th) : undefined
                };
            });
            // Extract data from <tbody>
            const rows = slottedTable.querySelectorAll('tbody tr');
            const data = Array.from(rows).map((tr, _rowIndex) => {
                const cells = tr.querySelectorAll('td');
                const row = {};
                cells.forEach((td, index) => {
                    if (index < columns.length) {
                        const column = columns[index];
                        const dataKey = td.getAttribute('data-key') || column.key;
                        // Store both text content and HTML if needed
                        if (td.innerHTML.trim().includes('<')) {
                            // Cell contains HTML (like forms, badges, etc.)
                            row[dataKey] = td.textContent.trim();
                            row[`${dataKey}_html`] = td.innerHTML.trim();
                        }
                        else {
                            row[dataKey] = td.textContent.trim();
                        }
                    }
                });
                return row;
            });
            return { columns, data };
        }
        catch (error) {
            console.error('SecureTable: Error parsing slotted table', error);
            return null;
        }
    }
    /**
     * Create a render function for HTML content
     * @private
     */
    #createRenderFunction(_th) {
        return (value, row, columnKey) => {
            const htmlKey = `${columnKey}_html`;
            return row[htmlKey] || this.#sanitize(value);
        };
    }
    /**
     * Set table data
     */
    set data(data) {
        if (!Array.isArray(data)) {
            console.error('SecureTable: data must be an array');
            return;
        }
        console.log('SecureTable: Setting data, count:', data.length);
        this.#data = data;
        this.#filteredData = [...data];
        this.#render();
    }
    /**
     * Get table data
     */
    get data() {
        return this.#data;
    }
    /**
     * Set column configuration
     */
    set columns(columns) {
        if (!Array.isArray(columns)) {
            console.error('SecureTable: columns must be an array');
            return;
        }
        console.log('SecureTable: Setting columns, count:', columns.length);
        this.#columns = columns;
        this.#render();
    }
    /**
     * Get column configuration
     */
    get columns() {
        return this.#columns;
    }
    /**
     * Apply filter to data
     * @private
     */
    #applyFilter(term) {
        this.#filterTerm = term.toLowerCase();
        if (!this.#filterTerm) {
            this.#filteredData = [...this.#data];
        }
        else {
            this.#filteredData = this.#data.filter(row => {
                return this.#columns.some(col => {
                    if (col.filterable === false)
                        return false;
                    const value = String(row[col.key] || '').toLowerCase();
                    return value.includes(this.#filterTerm);
                });
            });
        }
        this.#pagination.currentPage = 1; // Reset to first page
        this.#updateTableContent();
        this.audit('table_filtered', {
            filterTerm: term,
            resultCount: this.#filteredData.length
        });
    }
    /**
     * Apply sorting to data
     * @private
     */
    #applySort(columnKey) {
        if (this.#sortConfig.column === columnKey) {
            // Toggle direction
            this.#sortConfig.direction = this.#sortConfig.direction === 'asc' ? 'desc' : 'asc';
        }
        else {
            this.#sortConfig.column = columnKey;
            this.#sortConfig.direction = 'asc';
        }
        this.#filteredData.sort((a, b) => {
            const aVal = a[columnKey];
            const bVal = b[columnKey];
            let comparison = 0;
            if (aVal > bVal)
                comparison = 1;
            if (aVal < bVal)
                comparison = -1;
            return this.#sortConfig.direction === 'asc' ? comparison : -comparison;
        });
        this.#updateTableContent();
        this.audit('table_sorted', {
            column: columnKey,
            direction: this.#sortConfig.direction
        });
    }
    /**
     * Change page
     * @private
     */
    #goToPage(pageNumber) {
        const totalPages = Math.ceil(this.#filteredData.length / this.#pagination.pageSize);
        if (pageNumber < 1 || pageNumber > totalPages)
            return;
        this.#pagination.currentPage = pageNumber;
        this.#updateTableContent();
    }
    /**
     * Simple HTML sanitization to prevent XSS
     * @private
     */
    #sanitize(str) {
        if (!str)
            return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    /**
     * Mask sensitive column values based on tier
     * @private
     */
    #maskValue(value, tier) {
        if (!value)
            return '-';
        const strValue = String(value);
        if (tier === SecurityTier.SENSITIVE && strValue.length > 4) {
            return '\u2022'.repeat(strValue.length - 4) + strValue.slice(-4);
        }
        if (tier === SecurityTier.CRITICAL) {
            return '\u2022'.repeat(strValue.length);
        }
        return this.#sanitize(strValue);
    }
    /**
     * Render cell content with custom render function if available
     * @private
     */
    #renderCell(value, row, column) {
        // If column has custom render function, use it
        if (typeof column.render === 'function') {
            return column.render(value, row, column.key);
        }
        // Check if we have stored HTML content from server-rendered table
        const htmlKey = `${column.key}_html`;
        if (row[htmlKey]) {
            // Don't mask HTML content, it's already rendered
            return row[htmlKey];
        }
        // Otherwise, mask value based on security tier
        return this.#maskValue(value, column.tier);
    }
    /**
     * Get component styles - placeholder for development.
     * The build process (css-inliner.js) replaces this with minified CSS from secure-table.css.
     * @private
     */
    /**
   * Get component styles
   * @private
   * @returns {string} Component CSS
   */
  #getComponentStyles() {
    return `:host{display:block;font-family:var(--secure-ui-font-family-base)}.table-container{background:var(--secure-ui-color-bg-primary);border-radius:var(--secure-ui-border-radius-lg);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);overflow:hidden}.table-header{display:flex;justify-content:space-between;align-items:center;padding:var(--secure-ui-space-4);background-color:var(--secure-ui-color-bg-secondary);border-bottom:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);gap:var(--secure-ui-space-3);flex-wrap:wrap}.table-title{font-size:var(--secure-ui-font-size-lg);font-weight:var(--secure-ui-font-weight-semibold);color:var(--secure-ui-color-text-primary);margin:0}.table-controls{display:flex;gap:var(--secure-ui-space-3);align-items:center}.search-input{padding:var(--secure-ui-space-2) var(--secure-ui-space-3);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);border-radius:var(--secure-ui-border-radius-base);font-size:var(--secure-ui-font-size-sm);font-family:var(--secure-ui-font-family-base);color:var(--secure-ui-color-text-primary);background-color:var(--secure-ui-color-bg-primary);min-width:200px;transition:all var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out)}.search-input:focus{outline:none;border-color:var(--secure-ui-color-primary);box-shadow:var(--secure-ui-shadow-focus)}.search-input::placeholder{color:var(--secure-ui-color-text-secondary)}.table-wrapper{overflow-x:auto;overflow-y:visible}.data-table{width:100%;border-collapse:collapse;font-size:var(--secure-ui-font-size-sm);color:var(--secure-ui-table-font-color)}.data-table thead{background-color:var(--secure-ui-color-bg-tertiary);border-bottom:var(--secure-ui-border-width-base) solid var(--secure-ui-color-border)}.data-table th{padding:var(--secure-ui-space-3) var(--secure-ui-space-4);text-align:left;font-weight:var(--secure-ui-font-weight-semibold);color:var(--secure-ui-color-text-primary);white-space:nowrap;position:relative}.data-table th.sortable{cursor:pointer;user-select:none;transition:background-color var(--secure-ui-transition-fast) var(--secure-ui-transition-ease-in-out)}.data-table th.sortable:hover{background-color:var(--secure-ui-color-bg-secondary)}.data-table th.sorted{color:var(--secure-ui-color-primary)}.sort-indicator{display:inline-block;margin-left:var(--secure-ui-space-1);font-size:var(--secure-ui-font-size-xs);opacity:0.5;transition:opacity var(--secure-ui-transition-fast) var(--secure-ui-transition-ease-in-out)}.data-table th.sorted .sort-indicator{opacity:1}.data-table tbody tr{border-bottom:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);transition:background-color var(--secure-ui-transition-fast) var(--secure-ui-transition-ease-in-out)}.data-table tbody tr:hover{background-color:var(--secure-ui-color-bg-secondary)}.data-table tbody tr:last-child{border-bottom:none}.data-table td{padding:var(--secure-ui-space-3) var(--secure-ui-space-4);color:var(--secure-ui-color-text-primary);vertical-align:middle}.masked-cell{font-family:var(--secure-ui-font-family-mono);color:var(--secure-ui-color-text-secondary);letter-spacing:0.1em}.empty-state{padding:var(--secure-ui-space-8) var(--secure-ui-space-4);text-align:center;color:var(--secure-ui-color-text-secondary)}.empty-state-icon{font-size:var(--secure-ui-font-size-3xl);margin-bottom:var(--secure-ui-space-2)}.empty-state-text{font-size:var(--secure-ui-font-size-base);margin:0}.pagination{display:flex;justify-content:space-between;align-items:center;padding:var(--secure-ui-space-4);background-color:var(--secure-ui-color-bg-secondary);border-top:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);gap:var(--secure-ui-space-3);flex-wrap:wrap}.pagination-info{font-size:var(--secure-ui-font-size-sm);color:var(--secure-ui-color-text-secondary)}.pagination-controls{display:flex;gap:var(--secure-ui-space-2)}.pagination-button{padding:var(--secure-ui-space-2) var(--secure-ui-space-3);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);border-radius:var(--secure-ui-border-radius-base);background-color:var(--secure-ui-color-bg-primary);color:var(--secure-ui-color-text-primary);font-size:var(--secure-ui-font-size-sm);font-family:var(--secure-ui-font-family-base);cursor:pointer;transition:all var(--secure-ui-transition-base) var(--secure-ui-transition-ease-in-out)}.pagination-button:hover:not(:disabled){background-color:var(--secure-ui-color-primary);color:var(--secure-ui-color-text-inverse);border-color:var(--secure-ui-color-primary)}.pagination-button:disabled{opacity:var(--secure-ui-input-disabled-opacity);cursor:not-allowed}.pagination-button.active{background-color:var(--secure-ui-color-primary);color:var(--secure-ui-color-text-inverse);border-color:var(--secure-ui-color-primary)}.page-size-selector{display:flex;align-items:center;gap:var(--secure-ui-space-2);font-size:var(--secure-ui-font-size-sm);color:var(--secure-ui-color-text-secondary)}.page-size-select{padding:var(--secure-ui-space-1) var(--secure-ui-space-2);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border);border-radius:var(--secure-ui-border-radius-base);background-color:var(--secure-ui-color-bg-primary);color:var(--secure-ui-color-text-primary);font-size:var(--secure-ui-font-size-sm);font-family:var(--secure-ui-font-family-base);cursor:pointer}.loading-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.8);display:flex;justify-content:center;align-items:center;z-index:var(--secure-ui-z-sticky)}.loading-spinner{width:40px;height:40px;border:4px solid var(--secure-ui-color-border);border-top-color:var(--secure-ui-color-primary);border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}:host([security-tier="authenticated"]) .table-container{border-top:var(--secure-ui-border-width-thick) solid var(--secure-ui-tier-authenticated)}:host([security-tier="sensitive"]) .table-container{border-top:var(--secure-ui-border-width-thick) solid var(--secure-ui-tier-sensitive)}:host([security-tier="critical"]) .table-container{border-top:var(--secure-ui-border-width-thick) solid var(--secure-ui-tier-critical)}.security-badge{display:inline-block;padding:var(--secure-ui-badge-padding);margin-left:var(--secure-ui-space-2);font-size:var(--secure-ui-badge-font-size);font-weight:var(--secure-ui-font-weight-semibold);border-radius:var(--secure-ui-badge-border-radius);text-transform:uppercase;background-color:var(--secure-ui-color-bg-tertiary);color:var(--secure-ui-color-text-secondary);border:var(--secure-ui-border-width-thin) solid var(--secure-ui-color-border)}@media (max-width:768px){.table-header{flex-direction:column;align-items:stretch}.table-controls{flex-direction:column;width:100%}.search-input{width:100%;min-width:auto}.pagination{flex-direction:column;align-items:stretch}.pagination-controls{justify-content:center}.table-wrapper{position:relative}.table-wrapper::after{content:'← Scroll →';position:absolute;bottom:var(--secure-ui-space-2);right:var(--secure-ui-space-2);font-size:var(--secure-ui-font-size-xs);color:var(--secure-ui-color-text-secondary);background-color:var(--secure-ui-color-bg-tertiary);padding:var(--secure-ui-space-1) var(--secure-ui-space-2);border-radius:var(--secure-ui-border-radius-sm);pointer-events:none}}.data-table tbody tr:nth-child(even){background-color:rgba(0,0,0,0.01)}.data-table tbody tr:nth-child(even):hover{background-color:var(--secure-ui-color-bg-secondary)}`;
  }
    /**
     * Generate the table body, thead, and pagination HTML
     * @private
     */
    #renderTableContent() {
        const totalPages = Math.ceil(this.#filteredData.length / this.#pagination.pageSize);
        const startIndex = (this.#pagination.currentPage - 1) * this.#pagination.pageSize;
        const endIndex = startIndex + this.#pagination.pageSize;
        const pageData = this.#filteredData.slice(startIndex, endIndex);
        let tableHtml;
        let paginationHtml;
        if (pageData.length === 0 || this.#columns.length === 0) {
            tableHtml = `
        <div class="empty-state">
          <div class="empty-state-icon">\uD83D\uDD0D</div>
          <h3>${this.#columns.length === 0 ? 'No columns configured' : 'No results found'}</h3>
          <p>${this.#columns.length === 0 ? 'Set the columns property to configure the table' : 'Try adjusting your search term'}</p>
        </div>`;
            paginationHtml = '';
        }
        else {
            tableHtml = `
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                ${this.#columns.map(col => `
                  <th
                    class="${col.sortable !== false ? 'sortable' : ''} ${this.#sortConfig.column === col.key ? 'sorted' : ''}"
                    data-column="${col.key}"
                  >
                    ${this.#sanitize(col.label)}
                    ${col.sortable !== false ? `<span class="sort-indicator">${this.#sortConfig.column === col.key ? (this.#sortConfig.direction === 'asc' ? '\u25B2' : '\u25BC') : '\u25B2'}</span>` : ''}
                    ${col.tier ? `<span class="security-badge">${col.tier}</span>` : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${pageData.map(row => `
                <tr>
                  ${this.#columns.map(col => `
                    <td>${this.#renderCell(row[col.key], row, col)}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
            paginationHtml = totalPages > 1 ? `
        <div class="pagination">
          <div class="pagination-info">
            Showing ${startIndex + 1}-${Math.min(endIndex, this.#filteredData.length)} of ${this.#filteredData.length} results
          </div>
          <div class="pagination-controls">
            <button class="pagination-button" id="prevBtn" ${this.#pagination.currentPage === 1 ? 'disabled' : ''}>
              \u2190 Previous
            </button>
            ${this.#renderPageNumbers(totalPages)}
            <button class="pagination-button" id="nextBtn" ${this.#pagination.currentPage === totalPages ? 'disabled' : ''}>
              Next \u2192
            </button>
          </div>
        </div>` : '';
        }
        return { tableHtml, paginationHtml };
    }
    /**
     * Full initial render of the table
     * @private
     */
    #render() {
        if (!this.#shadow)
            return;
        // Apply styles via adoptedStyleSheets (CSP-compliant, no nonce required)
        const baseSheet = new CSSStyleSheet();
        baseSheet.replaceSync(this.getBaseStyles());
        const componentSheet = new CSSStyleSheet();
        componentSheet.replaceSync(this.#getComponentStyles());
        this.#shadow.adoptedStyleSheets = [baseSheet, componentSheet];
        const { tableHtml, paginationHtml } = this.#renderTableContent();
        this.#shadow.innerHTML = `
      <!-- Slot for server-rendered table (fallback when JS fails to load) -->
      <slot name="table"></slot>

      <div class="table-container">
        <div class="table-header">
          <input
            type="search"
            class="search-input"
            placeholder="Search across all columns..."
            value="${this.#filterTerm}"
            id="searchInput"
          />
        </div>
        <div id="tableContent">${tableHtml}</div>
        <div id="paginationContent">${paginationHtml}</div>
      </div>
    `;
        // Attach event listeners
        this.#attachEventListeners();
    }
    /**
     * Partial update — only replaces table body and pagination, preserving search input focus.
     * @private
     */
    #updateTableContent() {
        if (!this.#shadow)
            return;
        const tableContainer = this.#shadow.getElementById('tableContent');
        const paginationContainer = this.#shadow.getElementById('paginationContent');
        if (!tableContainer) {
            // Fallback to full render if containers don't exist yet
            this.#render();
            return;
        }
        const { tableHtml, paginationHtml } = this.#renderTableContent();
        tableContainer.innerHTML = tableHtml;
        if (paginationContainer) {
            paginationContainer.innerHTML = paginationHtml;
        }
        // Re-attach listeners for table and pagination (search input listener is preserved)
        this.#attachTableEventListeners();
    }
    /**
     * Render page number buttons
     * @private
     */
    #renderPageNumbers(totalPages) {
        const maxButtons = 5;
        let startPage = Math.max(1, this.#pagination.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        let buttons = '';
        for (let i = startPage; i <= endPage; i++) {
            buttons += `
        <button
          class="pagination-button ${i === this.#pagination.currentPage ? 'active' : ''}"
          data-page="${i}"
        >
          ${i}
        </button>
      `;
        }
        return buttons;
    }
    /**
     * Attach all event listeners (called on full render only)
     * @private
     */
    #attachEventListeners() {
        // Search input — only attached once on full render, preserved across partial updates
        const searchInput = this.#shadow.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.#applyFilter(e.target.value);
            });
        }
        // Table and pagination listeners
        this.#attachTableEventListeners();
    }
    /**
     * Attach event listeners for table headers and pagination (called on every update)
     * @private
     */
    #attachTableEventListeners() {
        // Column sorting
        const headers = this.#shadow.querySelectorAll('th.sortable');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-column');
                this.#applySort(column);
            });
        });
        // Pagination
        const prevBtn = this.#shadow.getElementById('prevBtn');
        const nextBtn = this.#shadow.getElementById('nextBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.#goToPage(this.#pagination.currentPage - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.#goToPage(this.#pagination.currentPage + 1);
            });
        }
        // Page number buttons
        const pageButtons = this.#shadow.querySelectorAll('.pagination-button[data-page]');
        pageButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.getAttribute('data-page'), 10);
                this.#goToPage(page);
            });
        });
        // Action button delegation — dispatches 'table-action' CustomEvent on the host
        // element when any [data-action] element inside the table is clicked.
        // This allows page-level scripts to handle action buttons without needing
        // access to the closed shadow DOM.
        const tableContent = this.#shadow.getElementById('tableContent');
        if (tableContent) {
            tableContent.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target)
                    return;
                const action = target.getAttribute('data-action');
                // Collect all data-* attributes from the action element
                const detail = { action: action };
                for (const attr of Array.from(target.attributes)) {
                    if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
                        // Convert data-user-id to userId style key
                        const key = attr.name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                        detail[key] = attr.value;
                    }
                }
                this.dispatchEvent(new CustomEvent('table-action', {
                    bubbles: true,
                    composed: true,
                    detail
                }));
                this.audit('table_action', detail);
            });
        }
    }
}
// Register the custom element
customElements.define('secure-table', SecureTable);
//# sourceMappingURL=secure-table.js.map