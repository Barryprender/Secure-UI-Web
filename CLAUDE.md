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

## Secure-UI Showcase Site — Commercial Objectives

The showcase site at secure-ui-web.fly.dev is a commercial product site for developers.
Its sole purpose is to convert visiting developers into adopters of Secure-UI.
Every content, copy, and UX decision must serve that goal.

---

### Primary audience

Developers evaluating security-focused UI component solutions. They are technically
literate, sceptical of security claims, and will read the code before they trust the
copy. They need to trust the library before they adopt it. Credibility is earned through
specificity, honesty, and live evidence — not marketing language.

---

### Tone

Commercial and polished. This is a product site, not a portfolio, blog, or open-source
readme. Write copy as a product. Avoid casual language, first-person developer narration,
and hobby-project framing. Never use words like "simple", "just", "easy" — these are
hedging words that reduce perceived quality.

---

### Conversion hierarchy

Every page section must serve one of these developer adoption questions, in order:

1. What does it do and why does it matter? (hero)
2. Can I trust it? (live demos, OWASP mapping, honest FAQ)
3. Is it free and open? (MIT licence — surface near the hero, not buried in the footer)
4. How do I start? (primary CTA leads to installation, not exploration)

If a section does not serve one of these questions, it does not belong on the homepage.

---

### CTA rules

- The primary hero CTA must be an adoption action: "Get started" or "Install" linking
  to the Quick Start documentation — not "See demos" or "Read the docs"
- The npm install snippet in the hero is a trust signal, not a CTA — it must be
  accompanied by a clickable "Get started" button
- Secondary CTAs (demos, docs) are permitted below the fold
- Never add a CTA that leads to a dead end, a login wall, or an incomplete feature

---

### Content rules

- Security claims must be specific and verifiable — no vague assurances
- Where a limitation exists, state it honestly (e.g. client-side is not a replacement
  for server-side validation) — the OWASP table's "Complementary" distinction is correct
  and must be preserved
- Never claim "100% security" or equivalent — the site's own FAQ and OWASP table
  contradict this and it damages credibility with security-literate developers
- The footer tagline must not make absolute security claims. Correct version:
  "Client-side security defaults. Zero dependencies. No CAPTCHA required."
- Surface "MIT Licence · Free forever" near the hero or primary CTA — licence clarity
  removes adoption friction immediately

---

### Navigation rules

- Do not add or reinstate a "Sign In" nav item unless a functional authenticated
  dashboard exists and is documented. An unexplained Sign In link creates confusion
  and implies incomplete SaaS infrastructure.
- Navigation items must link to content that exists and is complete

---

### Homepage section rules

**Keep and protect:**
- Hero headline and sub-headline — strong, benefit-led, do not dilute
- Live interactive component demo — primary trust signal, must remain above or
  immediately below the fold
- Bot detection / telemetry section — key differentiator, keep prominent
- OWASP A01–A10 table — excellent, specific, honest. Do not remove or summarise it.
  The "Addressed" vs "Complementary" distinction is intentional and must not be changed.
- FAQ — well-constructed, keeps credibility. The signing key risk answer is correct
  and must not be softened or removed.
- Integration code examples (HTML + Go) — these serve developer trust directly

**Reduce or move off homepage:**
- Theming section — belongs in the Theming sub-page and documentation, not the
  homepage. On the homepage it shifts the product story from security library to UI kit.
  If it remains on the homepage, reduce it to a single sentence with a link.

**Add (do not remove once added):**
- A social proof signal near the hero: npm install count, GitHub star count, or
  similar. Even a modest honest number is more persuasive than none. Do not fabricate
  or inflate figures.
- "MIT Licence · Free forever" near the primary CTA

---

### Page title

Format: `Secure-UI — [primary value proposition]`
The product name must lead. Example:
`Secure-UI — Security-hardened Web Components. Bot Detection Without CAPTCHA.`
Never bury the product name after a feature description.

---

### What to avoid

- Personal narrative ("I built this because...", "as the author...")
- Apologetic or hedging language ("simple", "just", "lightweight", "easy to use",
  "small library")
- Feature lists without security context — always pair a feature with its benefit
- Anything that frames the library as experimental, a side project, or incomplete
- UI or copy changes that reduce perceived product maturity or professionalism
- Absolute security claims that are contradicted elsewhere on the site
- Sections or features that serve CV/portfolio purposes rather than developer adoption
- Unexplained UI elements (nav items, badges, signals) that have no supporting content

---

### Preserve unconditionally

- Existing visual identity, colour scheme, and typographic hierarchy
- OWASP A01–A10 as the primary organisational framework for security coverage
- The bot detection / telemetry explanation and live signal display
- The "Addressed" vs "Complementary" honesty in the OWASP table
- All live component demonstrations — they are the primary trust signal
- The signing key security caveat in the FAQ — removing it would be dishonest
- The "Is this a replacement for server-side validation?" FAQ answer — correct and critical
- The Go server handler code example — demonstrates real-world integration