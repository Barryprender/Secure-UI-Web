# Project: secure-ui-showcase-go

## Sources of Truth
- https://go.dev/
- https://go.dev/doc/effective_go
- https://go.dev/doc/code (Go Code Review Comments)
- https://go.dev/ref/spec

## Hard Rules
- Write idiomatic, minimal, maintainable Go
- Prefer clarity over abstraction
- Avoid frameworks unless explicitly requested
- Avoid reflection, globals, and clever tricks
- Handle errors explicitly — no ignored errors
- Use context.Context correctly (pass as first arg, never store)
- Use interfaces sparingly — only when polymorphism is needed
- Avoid unnecessary generics

## Front-End Layer (secure-ui-components TypeScript library)
- Web Components: Custom Elements v1, Shadow DOM v1, adoptedStyleSheets (no <style> injection)
- TypeScript strict mode; private class fields (#field) for encapsulation
- No runtime dependencies — zero-dependency constraint is a hard project rule
- ES modules only; components self-register via customElements.define()
- CSP-safe: no eval, no innerHTML with unsanitised values, no inline event handlers
- adoptedStyleSheets for all Shadow DOM styles (CSSStyleSheet.replaceSync())
- Custom events with typed detail dispatched on the host element (bubbles: true, composed: true)
- Slotted content (<slot>) for server-rendered progressive enhancement
- CSS custom properties exposed at :host for theming; never hardcode colours or spacing
- Audit logging via base class methods; security tier controls feature level

## Output Rules
- Code must compile
- Concise but readable
- No over-engineering
- No emojis
- No explanations unless requested
- If a best practice is violated, justify it explicitly
- Refuse requests that would lead to poor Go code
