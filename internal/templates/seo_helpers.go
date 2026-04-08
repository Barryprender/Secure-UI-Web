package templates

import (
	"encoding/json"
	"fmt"
	"time"
)

// HomeJsonLD returns JSON-LD for the home page: Organization + SoftwareApplication + SoftwareSourceCode + WebSite.
func HomeJsonLD(siteURL string) string {
	data := map[string]any{
		"@context": "https://schema.org",
		"@graph": []map[string]any{
			{
				"@type":       "Organization",
				"name":        "Secure-UI",
				"url":         siteURL,
				"description": "Security-first web component library with zero dependencies.",
				"logo": map[string]any{
					"@type":  "ImageObject",
					"url":    siteURL + "/static/favicon.svg",
					"width":  "512",
					"height": "512",
				},
				"sameAs": []string{
					"https://github.com/Barryprender/Secure-UI",
					"https://www.npmjs.com/package/secure-ui-components",
				},
			},
			{
				"@type":               "SoftwareApplication",
				"name":                "Secure-UI",
				"alternateName":       []string{"secure ui components", "secure UI component library", "secure form components"},
				"applicationCategory": "DeveloperApplication",
				"applicationSubCategory": "Web Component Library",
				"description":         "Drop-in secure UI components with built-in XSS protection, CSRF defence, behavioral bot detection, rate limiting, and CSP-safe Shadow DOM styling. Secure form components, input components, and payment components with zero runtime dependencies.",
				"url":                 siteURL,
				"downloadUrl":         "https://www.npmjs.com/package/secure-ui-components",
				"installUrl":          "https://www.npmjs.com/package/secure-ui-components",
				"offers": map[string]any{
					"@type":         "Offer",
					"price":         "0",
					"priceCurrency": "USD",
				},
				"operatingSystem": "Any",
				"keywords": []string{
					"secure ui components", "secure form components", "secure web components",
					"web components", "custom elements", "shadow dom", "security",
					"xss protection", "csrf protection", "form security", "typescript",
					"zero dependencies", "payment card", "pci", "behavioral telemetry",
					"bot detection", "audit logging", "injection detection",
				},
				"featureList": []string{
					"XSS sanitisation on all input components",
					"Real-time injection detection: script-tag, js-protocol, event-handler, html-injection, css-expression, vbscript, data-uri-html, template-syntax",
					"CSRF token injection and validation with secure-threat-detected event on absent token",
					"Behavioral bot detection and risk scoring",
					"PCI-compliant payment card input with Luhn validation",
					"Four security tiers: public, authenticated, sensitive, critical",
					"Audit logging without capturing raw sensitive values",
					"HMAC-SHA256 signed telemetry payloads with cached CryptoKey",
					"CSP-safe — no eval(), no unsafe-inline",
					"Zero runtime dependencies",
					"Progressive enhancement — works without JavaScript",
				},
				"license":             "https://github.com/Barryprender/Secure-UI/blob/main/LICENSE",
				"programmingLanguage": "TypeScript",
			},
			{
				"@type":           "SoftwareSourceCode",
				"name":            "secure-ui-components",
				"codeRepository":  "https://github.com/Barryprender/Secure-UI",
				"programmingLanguage": []string{"TypeScript", "Go"},
				"runtimePlatform": "Browser",
				"license":         "https://github.com/Barryprender/Secure-UI/blob/main/LICENSE",
				"description":     "Source code for the Secure-UI web component library. MIT licensed.",
				"url":             siteURL,
			},
			{
				"@type": "WebSite",
				"url":   siteURL,
				"name":  "Secure-UI",
				"potentialAction": map[string]any{
					"@type":       "SearchAction",
					"target":      siteURL + "/documentation?q={search_term}",
					"query-input": "required name=search_term",
				},
			},
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}

// DocsIndexJsonLD returns JSON-LD for the documentation index page.
func DocsIndexJsonLD(siteURL, canonicalURL string) string {
	data := map[string]any{
		"@context":    "https://schema.org",
		"@type":       "CollectionPage",
		"name":        "Secure Web Components API Reference",
		"description": "Complete API reference for all Secure-UI web components: XSS sanitisation, CSRF defence, security tiers, Shadow DOM styling, and framework integration guides.",
		"url":         canonicalURL,
		"isPartOf": map[string]any{
			"@type": "WebSite",
			"name":  "Secure-UI",
			"url":   siteURL,
		},
		"hasPart": []map[string]any{
			{"@type": "TechArticle", "name": "secure-input", "url": siteURL + "/documentation/secure-input"},
			{"@type": "TechArticle", "name": "secure-textarea", "url": siteURL + "/documentation/secure-textarea"},
			{"@type": "TechArticle", "name": "secure-select", "url": siteURL + "/documentation/secure-select"},
			{"@type": "TechArticle", "name": "secure-form", "url": siteURL + "/documentation/secure-form"},
			{"@type": "TechArticle", "name": "secure-file-upload", "url": siteURL + "/documentation/secure-file-upload"},
			{"@type": "TechArticle", "name": "secure-datetime", "url": siteURL + "/documentation/secure-datetime"},
			{"@type": "TechArticle", "name": "secure-table", "url": siteURL + "/documentation/secure-table"},
			{"@type": "TechArticle", "name": "secure-card", "url": siteURL + "/documentation/secure-card"},
			{"@type": "TechArticle", "name": "secure-telemetry-provider", "url": siteURL + "/documentation/secure-telemetry-provider"},
			{"@type": "TechArticle", "name": "secure-password-confirm", "url": siteURL + "/documentation/secure-password-confirm"},
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}

// ComponentsIndexJsonLD returns JSON-LD for the components index page.
func ComponentsIndexJsonLD(siteURL, canonicalURL string) string {
	data := map[string]any{
		"@context":    "https://schema.org",
		"@type":       "WebPage",
		"name":        "Components - Secure-UI",
		"description": "Interactive showcase for all Secure-UI web components.",
		"url":         canonicalURL,
		"isPartOf": map[string]any{
			"@type": "WebSite",
			"name":  "Secure-UI",
			"url":   siteURL,
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}

// DocsPageJsonLD returns JSON-LD for a component documentation page:
// TechArticle + BreadcrumbList.
func DocsPageJsonLD(siteURL, canonicalURL, componentName, description string) string {
	today := time.Now().UTC().Format("2006-01-02")
	data := map[string]any{
		"@context": "https://schema.org",
		"@graph": []map[string]any{
			{
				"@type":         "TechArticle",
				"headline":      fmt.Sprintf("%s - Secure-UI", componentName),
				"description":   description,
				"url":           canonicalURL,
				"datePublished": "2025-01-01",
				"dateModified":  today,
				"author": map[string]any{
					"@type": "Organization",
					"name":  "Secure-UI",
					"url":   siteURL,
				},
				"publisher": map[string]any{
					"@type": "Organization",
					"name":  "Secure-UI",
					"url":   siteURL,
				},
				"isPartOf": map[string]any{
					"@type": "WebSite",
					"name":  "Secure-UI",
					"url":   siteURL,
				},
			},
			{
				"@type": "BreadcrumbList",
				"itemListElement": []map[string]any{
					{"@type": "ListItem", "position": 1, "name": "Home", "item": siteURL + "/"},
					{"@type": "ListItem", "position": 2, "name": "Documentation", "item": siteURL + "/documentation"},
					{"@type": "ListItem", "position": 3, "name": componentName, "item": canonicalURL},
				},
			},
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}

// HomeFAQJsonLD returns FAQPage JSON-LD for the home page FAQ section.
func HomeFAQJsonLD() string {
	type answer struct {
		Type string `json:"@type"`
		Text string `json:"text"`
	}
	type question struct {
		Type           string `json:"@type"`
		Name           string `json:"name"`
		AcceptedAnswer answer `json:"acceptedAnswer"`
	}
	data := map[string]any{
		"@context": "https://schema.org",
		"@type":    "FAQPage",
		"mainEntity": []question{
			{
				Type: "Question",
				Name: "Does Secure-UI work without JavaScript?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "Yes. All components render as native HTML elements when JavaScript is unavailable. Client-side features — XSS sanitisation, rate limiting, audit logging — activate when JS is enabled. The page never breaks.",
				},
			},
			{
				Type: "Question",
				Name: "What is a security tier?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "A security tier is a per-field declaration of data sensitivity: public, authenticated, sensitive, or critical. Set it with the security-tier attribute on any component. The library applies the corresponding protections — stricter rate limits, autocomplete suppression, enhanced audit logging — automatically.",
				},
			},
			{
				Type: "Question",
				Name: "How does Secure-UI prevent XSS?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "Every input component scans the raw field value on every keystroke against 8 injection patterns — script tags, javascript: URIs, inline event handlers, injected HTML elements, CSS expressions, VBScript URIs, data:text/html payloads, and template injection probes. The first match fires a secure-threat-detected event (raw value intentionally absent). Values are also sanitised via HTML entity encoding before emitting. The closed Shadow DOM prevents host-page scripts from reaching component internals.",
				},
			},
			{
				Type: "Question",
				Name: "Is Secure-UI a replacement for server-side validation?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "No. Secure-UI is a client-side defence layer. Your server must still validate and sanitise all input — client-side controls can be bypassed. The components reduce frontend boilerplate and enforce security by default, but server-side validation is always the security boundary.",
				},
			},
			{
				Type: "Question",
				Name: "Does it work with React, Vue, Angular, or Next.js?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "Yes. Web Components are a browser standard supported by all major frameworks. Import the library once with a single script tag, then use the element tags anywhere in your templates — React, Vue, Angular, Svelte, Next.js, Nuxt, Go Templ, Django, Rails, or plain HTML.",
				},
			},
			{
				Type: "Question",
				Name: "How are CSRF tokens handled?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "The secure-form component automatically fetches a CSRF token from your server and injects it before each submission as both a request header and a hidden field. No manual token management is required. The token is single-use and expires server-side.",
				},
			},
			{
				Type: "Question",
				Name: "What makes this different from DOMPurify?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "DOMPurify sanitises HTML strings as a post-processing step. Secure-UI is a complete form component library: CSRF defence, behavioral bot detection, audit logging, security tier enforcement, and input sanitisation are part of the interaction model, not an afterthought.",
				},
			},
			{
				Type: "Question",
				Name: "Is there a CDN option?",
				AcceptedAnswer: answer{
					Type: "Answer",
					Text: "Yes. Load directly from unpkg without installing anything: &lt;script type=\"module\" src=\"https://unpkg.com/secure-ui-components/dist/secure-ui.bundle.js\"&gt;&lt;/script&gt;",
				},
			},
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}

// ComponentPageJsonLD returns JSON-LD for a component showcase page:
// SoftwareApplication + BreadcrumbList.
func ComponentPageJsonLD(siteURL, canonicalURL, componentName, description string) string {
	data := map[string]any{
		"@context": "https://schema.org",
		"@graph": []map[string]any{
			{
				"@type":               "SoftwareApplication",
				"name":                componentName + " — Secure-UI",
				"applicationCategory": "DeveloperApplication",
				"description":         description,
				"url":                 canonicalURL,
				"isPartOf": map[string]any{
					"@type": "SoftwareApplication",
					"name":  "Secure-UI",
					"url":   siteURL,
				},
				"offers": map[string]any{
					"@type":         "Offer",
					"price":         "0",
					"priceCurrency": "USD",
				},
			},
			{
				"@type": "BreadcrumbList",
				"itemListElement": []map[string]any{
					{"@type": "ListItem", "position": 1, "name": "Home", "item": siteURL + "/"},
					{"@type": "ListItem", "position": 2, "name": "Components", "item": siteURL + "/components"},
					{"@type": "ListItem", "position": 3, "name": componentName, "item": canonicalURL},
				},
			},
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}
