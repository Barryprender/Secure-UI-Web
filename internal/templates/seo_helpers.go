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
				"sameAs": []string{
					"https://github.com/Barryprender/Secure-UI",
					"https://www.npmjs.com/package/secure-ui-components",
				},
			},
			{
				"@type":               "SoftwareApplication",
				"name":                "Secure-UI",
				"applicationCategory": "DeveloperApplication",
				"applicationSubCategory": "Web Component Library",
				"description":         "Zero-dependency web components with built-in XSS protection, CSRF defence, behavioral bot detection, rate limiting, and CSP-safe Shadow DOM styling. Security tier declared per field; enforced automatically.",
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
					"web components", "custom elements", "shadow dom", "security",
					"xss protection", "csrf", "form security", "typescript",
					"zero dependencies", "payment card", "pci", "behavioral telemetry",
					"bot detection", "audit logging",
				},
				"featureList": []string{
					"XSS sanitisation on all input components",
					"CSRF token injection and validation",
					"Behavioral bot detection and risk scoring",
					"PCI-compliant payment card input with Luhn validation",
					"Four security tiers: public, authenticated, sensitive, critical",
					"Audit logging without capturing raw sensitive values",
					"HMAC-SHA256 signed telemetry payloads",
					"CSP-safe — no eval(), no unsafe-inline",
					"Zero runtime dependencies",
					"Progressive enhancement — works without JavaScript",
				},
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
		"@type":       "WebPage",
		"name":        "Documentation - Secure-UI",
		"description": "API reference for all Secure-UI web components.",
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
				"datePublished": "2024-09-01",
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
