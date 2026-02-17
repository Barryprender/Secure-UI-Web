// +build ignore

package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

const (
	prismVersion = "1.29.0"
	baseURL      = "https://cdn.jsdelivr.net/npm/prismjs@" + prismVersion
)

type Asset struct {
	URL      string
	Filename string
}

func main() {
	// Create directories if they don't exist
	if err := os.MkdirAll("static/js", 0755); err != nil {
		fmt.Printf("Error creating js directory: %v\n", err)
		os.Exit(1)
	}
	if err := os.MkdirAll("static/styles", 0755); err != nil {
		fmt.Printf("Error creating styles directory: %v\n", err)
		os.Exit(1)
	}

	// Define assets to download
	assets := []Asset{
		// Core Prism
		{baseURL + "/prism.js", "static/js/prism.js"},

		// Dark theme CSS (Tomorrow Night)
		{baseURL + "/themes/prism-tomorrow.min.css", "static/styles/prism.css"},

		// Language components (add more as needed)
		{baseURL + "/components/prism-go.min.js", "static/js/prism-go.min.js"},
		{baseURL + "/components/prism-javascript.min.js", "static/js/prism-javascript.min.js"},
		{baseURL + "/components/prism-typescript.min.js", "static/js/prism-typescript.min.js"},
		{baseURL + "/components/prism-bash.min.js", "static/js/prism-bash.min.js"},
		{baseURL + "/components/prism-json.min.js", "static/js/prism-json.min.js"},
		{baseURL + "/components/prism-markup.min.js", "static/js/prism-markup.min.js"},
		{baseURL + "/components/prism-css.min.js", "static/js/prism-css.min.js"},
	}

	fmt.Printf("Downloading Prism.js v%s...\n", prismVersion)

	for _, asset := range assets {
		if err := downloadFile(asset.URL, asset.Filename); err != nil {
			fmt.Printf("Error downloading %s: %v\n", asset.Filename, err)
			os.Exit(1)
		}
		fmt.Printf("✓ Downloaded %s\n", filepath.Base(asset.Filename))
	}

	fmt.Println("\n✅ All Prism.js files downloaded successfully!")
	fmt.Println("\nNext steps:")
	fmt.Println("1. Update layout.templ to use /static/styles/prism.css")
	fmt.Println("2. Update layout.templ to use /static/js/prism.js")
	fmt.Println("3. Remove CDN URLs from CSP in security.go")
}

func downloadFile(url, filepath string) error {
	// Create HTTP request
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}
