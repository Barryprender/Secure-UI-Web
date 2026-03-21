package handlers

import (
	"fmt"
	"net/http"
)

// RobotsTxt serves /robots.txt with explicit allow rules for known AI crawlers
// and a pointer to /llms.txt for LLM-native agents.
func (h *Handlers) RobotsTxt(w http.ResponseWriter, r *http.Request) {
	scheme := "https"
	if r.TLS == nil && r.Header.Get("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}
	base := scheme + "://" + r.Host

	// Private paths — same set for all agents.
	disallow := "Disallow: /dashboard\nDisallow: /table\nDisallow: /profile\nDisallow: /api/\n"

	// AI crawlers that respect their own User-agent block.
	// Listed individually so each can be selectively adjusted later.
	aiAgents := []string{
		"GPTBot",        // OpenAI
		"ChatGPT-User",  // OpenAI browsing
		"anthropic-ai",  // Anthropic
		"ClaudeBot",     // Anthropic
		"PerplexityBot", // Perplexity
		"Googlebot-Extended", // Google AI Overviews
		"YouBot",        // You.com
		"cohere-ai",     // Cohere
	}

	body := "User-agent: *\nAllow: /\n" + disallow + "\n"

	for _, agent := range aiAgents {
		body += fmt.Sprintf("User-agent: %s\nAllow: /\n%s\n", agent, disallow)
	}

	body += fmt.Sprintf("Sitemap: %s/sitemap.xml\n", base)
	body += fmt.Sprintf("Llms: %s/llms.txt\n", base)

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	fmt.Fprint(w, body)
}

// LLMsTxt serves /llms.txt — a machine-readable markdown summary of the site
// for LLM agents, following the llmstxt.org convention.
func (h *Handlers) LLMsTxt(w http.ResponseWriter, r *http.Request) {
	scheme := "https"
	if r.TLS == nil && r.Header.Get("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}
	base := scheme + "://" + r.Host

	body := fmt.Sprintf(`# Secure-UI

> Zero-dependency, security-first Web Components for HTML forms. Built-in XSS protection, CSRF defence, behavioral bot detection, PCI-compliant payment input, and audit logging — active by default on every component. Works with any server framework, template engine, or plain HTML.

Secure-UI is a TypeScript library published to npm as ` + "`secure-ui-components`" + `. Each component is a native Custom Element (Web Component) with a closed Shadow DOM, CSP-safe adopted stylesheets, and zero runtime dependencies. Security tier is declared per-field; the library enforces the corresponding protections automatically.

## Components

- [secure-input](%[1]s/documentation/secure-input): Secure text input with XSS sanitisation, rate limiting, paste detection, and four security tiers (public / authenticated / sensitive / critical). Audit log available via ` + "`getAuditLog()`" + `.
- [secure-select](%[1]s/documentation/secure-select): Secure dropdown with server-side allowlist validation, security tiers, and audit logging. Prevents client-side option injection.
- [secure-textarea](%[1]s/documentation/secure-textarea): Secure multi-line input with HTML sanitisation, configurable character limits, rate limiting, and security tiers.
- [secure-form](%[1]s/documentation/secure-form): Form orchestrator with built-in CSRF token injection, JSON submission, behavioral telemetry collection, and progressive enhancement fallback.
- [secure-file-upload](%[1]s/documentation/secure-file-upload): File upload with MIME type validation, size limits, drag-and-drop, preview generation, and virus scan hook support.
- [secure-datetime](%[1]s/documentation/secure-datetime): Date/time picker with range validation, timezone handling, and audit logging.
- [secure-table](%[1]s/documentation/secure-table): Data table with client-side sorting, column filtering, and per-column security tier display rules. Supports slotted HTML or programmatic data binding.
- [secure-card](%[1]s/documentation/secure-card): PCI-compliant payment card input with Luhn validation, card type detection (Visa, Mastercard, Amex, Discover), PAN masking on blur, and CVC protection. Full PAN and CVC are never exposed in DOM events, hidden inputs, or audit logs — only ` + "`last4`" + ` and ` + "`cardType`" + ` are shared.
- [secure-telemetry-provider](%[1]s/documentation/secure-telemetry-provider): Behavioral intelligence provider. Captures keystroke timing, dwell time, paste detection, autofill signals, and typing velocity. Signs the telemetry payload with HMAC-SHA256. Risk scoring flags bot-like or scripted interactions without tracking users.

## Security Model

- **Security tiers**: public, authenticated, sensitive, critical — declared per field, enforced by the component.
- **CSRF**: ` + "`secure-form`" + ` injects tokens automatically and validates the header on submission.
- **XSS**: All output is sanitised; Shadow DOM isolates component internals from the host page.
- **Audit logging**: Every component exposes ` + "`getAuditLog()`" + ` returning timestamped interaction records without capturing raw sensitive values.
- **Rate limiting**: Configurable per-component, client-side, with exponential back-off.
- **CSP-safe**: No ` + "`eval()`" + `, no ` + "`innerHTML`" + ` with unsanitised input, no inline event handlers. Styles applied via ` + "`adoptedStyleSheets`" + `.

## Installation

` + "```" + `bash
npm install secure-ui-components
` + "```" + `

` + "```" + `html
<script type="module" src="/components/index.js"></script>
` + "```" + `

## Live Demos

- [Form Demos](%[1]s/forms): Submittable login, subscription, and payment forms with live server responses and real-time behavioral telemetry panel.
- [Component Showcase](%[1]s/components): Interactive demos of all configurations for every component.
- [Registration Demo](%[1]s/registration): Full registration flow with server-side validation.

## Documentation

- [Documentation Index](%[1]s/documentation): Full API reference for all components — attributes, events, methods, CSS custom properties.
- [Theming Guide](%[1]s/theming): CSS custom property system and five built-in theme presets. Override at :root, per-component, or per-instance.
- [Telemetry Guide](%[1]s/telemetry): How behavioral intelligence works — signals captured, risk scoring algorithm, HMAC signing, and privacy guarantees.

## Legal & Privacy

- [Cookie Policy](%[1]s/cookies): Two cookies only — ` + "`__Host-session`" + ` (HttpOnly, SameSite=Strict, 24h) and ` + "`lang`" + ` (preference, 1 year). No analytics, no tracking, no third-party cookies.
- [MIT License](https://github.com/Barryprender/Secure-UI/blob/main/LICENSE): Open source, free to use.

## Source

- [GitHub](https://github.com/Barryprender/Secure-UI): Source code, issues, and contributions.
- [npm](https://www.npmjs.com/package/secure-ui-components): Package registry.
- [Sitemap](%[1]s/sitemap.xml): All public URLs.
`, base)

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	fmt.Fprint(w, body)
}

// sitemapEntry represents a single URL entry in the sitemap.
type sitemapEntry struct {
	loc        string
	priority   string
	changeFreq string
}

// Sitemap serves /sitemap.xml with all public, indexable pages.
// Auth-required pages (/dashboard, /table, /profile) are excluded.
func (h *Handlers) Sitemap(w http.ResponseWriter, r *http.Request) {
	scheme := "https"
	if r.TLS == nil && r.Header.Get("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}
	base := scheme + "://" + r.Host
	// Use a stable date tied to the last known content update.
	// Avoid time.Now() — dynamic lastmod signals to crawlers that
	// content changes daily even when it doesn't, wasting crawl budget.
	lastmod := "2026-03-21"

	entries := []sitemapEntry{
		{"/", "1.0", "weekly"},
		{"/forms", "0.7", "monthly"},
		{"/login", "0.3", "yearly"},
		{"/registration", "0.6", "monthly"},
		{"/documentation", "0.9", "weekly"},
		{"/documentation/secure-input", "0.8", "weekly"},
		{"/documentation/secure-textarea", "0.8", "weekly"},
		{"/documentation/secure-select", "0.8", "weekly"},
		{"/documentation/secure-form", "0.8", "weekly"},
		{"/documentation/secure-file-upload", "0.8", "weekly"},
		{"/documentation/secure-datetime", "0.8", "weekly"},
		{"/documentation/secure-table", "0.8", "weekly"},
		{"/theming", "0.8", "monthly"},
		{"/telemetry", "0.9", "monthly"},
		{"/telemetry-pro", "0.9", "monthly"},
		{"/cookies", "0.3", "yearly"},
		{"/components", "0.9", "weekly"},
		{"/components/secure-input", "0.8", "weekly"},
		{"/components/secure-textarea", "0.8", "weekly"},
		{"/components/secure-select", "0.8", "weekly"},
		{"/components/secure-form", "0.8", "weekly"},
		{"/components/secure-file-upload", "0.8", "weekly"},
		{"/components/secure-datetime", "0.8", "weekly"},
		{"/components/secure-table", "0.8", "weekly"},
		{"/components/secure-card", "0.8", "weekly"},
		{"/components/secure-telemetry-provider", "0.8", "weekly"},
		{"/documentation/secure-card", "0.8", "weekly"},
		{"/documentation/secure-telemetry-provider", "0.8", "weekly"},
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")

	fmt.Fprint(w, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	fmt.Fprint(w, "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")

	for _, e := range entries {
		fmt.Fprintf(w, "  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>\n",
			base, e.loc, lastmod, e.changeFreq, e.priority)
	}

	fmt.Fprint(w, "</urlset>\n")
}
