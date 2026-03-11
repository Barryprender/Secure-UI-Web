package templates

import (
	"encoding/json"
	"fmt"
)

// HomeJsonLD returns JSON-LD for the home page: Organization + SoftwareApplication.
func HomeJsonLD(siteURL string) string {
	data := map[string]any{
		"@context": "https://schema.org",
		"@graph": []map[string]any{
			{
				"@type":       "Organization",
				"name":        "Secure-UI",
				"url":         siteURL,
				"description": "Security-first web component library with zero dependencies.",
			},
			{
				"@type":               "SoftwareApplication",
				"name":                "Secure-UI",
				"applicationCategory": "DeveloperApplication",
				"description":         "Zero-dependency web components with built-in XSS protection, CSRF defence, rate limiting, and CSP-safe Shadow DOM styling.",
				"url":                 siteURL,
				"offers": map[string]any{
					"@type":         "Offer",
					"price":         "0",
					"priceCurrency": "USD",
				},
				"operatingSystem": "Any",
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
	data := map[string]any{
		"@context": "https://schema.org",
		"@graph": []map[string]any{
			{
				"@type":       "TechArticle",
				"headline":    fmt.Sprintf("%s - Secure-UI", componentName),
				"description": description,
				"url":         canonicalURL,
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

// ComponentPageJsonLD returns JSON-LD for a component showcase page: BreadcrumbList.
func ComponentPageJsonLD(siteURL, canonicalURL, componentName string) string {
	data := map[string]any{
		"@context": "https://schema.org",
		"@type":    "BreadcrumbList",
		"itemListElement": []map[string]any{
			{"@type": "ListItem", "position": 1, "name": "Home", "item": siteURL + "/"},
			{"@type": "ListItem", "position": 2, "name": "Components", "item": siteURL + "/components"},
			{"@type": "ListItem", "position": 3, "name": componentName, "item": canonicalURL},
		},
	}
	b, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return string(b)
}
