package handlers

import (
	"fmt"
	"net/http"
	"time"
)

// RobotsTxt serves /robots.txt. The sitemap URL is derived from the live host
// so it is correct in both dev and production without configuration.
func (h *Handlers) RobotsTxt(w http.ResponseWriter, r *http.Request) {
	scheme := "https"
	if r.TLS == nil && r.Header.Get("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}

	body := fmt.Sprintf("User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /table\nDisallow: /profile\nDisallow: /api/\n\nSitemap: %s://%s/sitemap.xml\n",
		scheme, r.Host)

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
	today := time.Now().UTC().Format("2006-01-02")

	entries := []sitemapEntry{
		{"/", "1.0", "weekly"},
		{"/forms", "0.7", "monthly"},
		{"/login", "0.3", "yearly"},
		{"/register", "0.5", "yearly"},
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
		{"/components", "0.9", "weekly"},
		{"/components/secure-input", "0.8", "weekly"},
		{"/components/secure-textarea", "0.8", "weekly"},
		{"/components/secure-select", "0.8", "weekly"},
		{"/components/secure-form", "0.8", "weekly"},
		{"/components/secure-file-upload", "0.8", "weekly"},
		{"/components/secure-datetime", "0.8", "weekly"},
		{"/components/secure-table", "0.8", "weekly"},
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")

	fmt.Fprint(w, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	fmt.Fprint(w, "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")

	for _, e := range entries {
		fmt.Fprintf(w, "  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>\n",
			base, e.loc, today, e.changeFreq, e.priority)
	}

	fmt.Fprint(w, "</urlset>\n")
}
