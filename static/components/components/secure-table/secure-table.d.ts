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
import type { TableColumnDefinition } from '../../core/types.js';
export declare class SecureTable extends SecureBaseComponent {
    #private;
    constructor();
    /**
     * Required by abstract base class, but this component manages its own rendering
     * via the private #render() method.
     * @protected
     */
    protected render(): DocumentFragment | HTMLElement | null;
    /**
     * Component lifecycle - called when added to DOM
     */
    connectedCallback(): void;
    /**
     * Set table data
     */
    set data(data: Record<string, unknown>[]);
    /**
     * Get table data
     */
    get data(): Record<string, unknown>[];
    /**
     * Set column configuration
     */
    set columns(columns: TableColumnDefinition[]);
    /**
     * Get column configuration
     */
    get columns(): TableColumnDefinition[];
}
//# sourceMappingURL=secure-table.d.ts.map