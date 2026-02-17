/**
 * @fileoverview Secure Submit Button Component
 *
 * A security-aware form submit button that integrates with <secure-form>.
 * The button's enabled/disabled state is driven by the parent form's security
 * tier and field validation state.
 *
 * Tier behaviour:
 * - public:        Button enabled by default (validation.required = false)
 * - authenticated: Button disabled until all required fields are valid
 * - sensitive:     Button disabled until all required fields are valid
 * - critical:      Button disabled until all required fields are valid
 *
 * Usage:
 * <secure-form action="/api/data" method="POST" security-tier="sensitive">
 *   <secure-input label="Name" name="name" required></secure-input>
 *   <secure-submit-button label="Submit"></secure-submit-button>
 * </secure-form>
 *
 * @module secure-submit-button
 * @license MIT
 */
import { SecureBaseComponent } from '../../core/base-component.js';
/**
 * Secure Submit Button Web Component
 *
 * Provides a security-aware submit button that monitors parent form validity
 * and enables/disables based on the form's security tier requirements.
 *
 * @extends SecureBaseComponent
 */
export declare class SecureSubmitButton extends SecureBaseComponent {
    #private;
    /**
     * Observed attributes
     */
    static get observedAttributes(): string[];
    constructor();
    /**
     * Connected to DOM — discover form, attach listeners, evaluate state
     */
    connectedCallback(): void;
    /**
     * Render the button inside shadow DOM
     */
    protected render(): DocumentFragment | HTMLElement | null;
    protected handleAttributeChange(name: string, _oldValue: string | null, newValue: string | null): void;
    /**
     * Whether the button is disabled
     */
    get disabled(): boolean;
    set disabled(value: boolean);
    /**
     * The button label text
     */
    get label(): string;
    set label(value: string);
    disconnectedCallback(): void;
}
export default SecureSubmitButton;
//# sourceMappingURL=secure-submit-button.d.ts.map