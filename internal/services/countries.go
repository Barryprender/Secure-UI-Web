package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// Country represents a country with its ISO code and name
type Country struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// restCountryResponse represents the response from restcountries.com API
type restCountryResponse struct {
	Name struct {
		Common string `json:"common"`
	} `json:"name"`
	CCA2 string `json:"cca2"`
}

// CountryService provides country data with caching
type CountryService struct {
	cache      []Country
	cacheTime  time.Time
	cacheTTL   time.Duration
	mu         sync.RWMutex
	httpClient *http.Client
}

// NewCountryService creates a new CountryService with the given cache TTL
func NewCountryService(cacheTTL time.Duration) *CountryService {
	return &CountryService{
		cacheTTL: cacheTTL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetAll returns all countries, fetching from the API if cache is stale
func (s *CountryService) GetAll() ([]Country, error) {
	// Check cache first (read lock)
	s.mu.RLock()
	if len(s.cache) > 0 && time.Since(s.cacheTime) < s.cacheTTL {
		countries := make([]Country, len(s.cache))
		copy(countries, s.cache)
		s.mu.RUnlock()
		return countries, nil
	}
	s.mu.RUnlock()

	// Cache is stale or empty, fetch from API (write lock)
	s.mu.Lock()
	defer s.mu.Unlock()

	// Double-check after acquiring write lock (another goroutine may have refreshed)
	if len(s.cache) > 0 && time.Since(s.cacheTime) < s.cacheTTL {
		countries := make([]Country, len(s.cache))
		copy(countries, s.cache)
		return countries, nil
	}

	// Fetch from external API
	countries, err := s.fetchFromAPI()
	if err != nil {
		// If we have stale cache, return it instead of error
		if len(s.cache) > 0 {
			log.Printf("Failed to fetch countries from API, using stale cache: %v", err)
			countries := make([]Country, len(s.cache))
			copy(countries, s.cache)
			return countries, nil
		}
		return nil, fmt.Errorf("failed to fetch countries: %w", err)
	}

	// Update cache
	s.cache = countries
	s.cacheTime = time.Now()

	// Return a copy
	result := make([]Country, len(countries))
	copy(result, countries)
	return result, nil
}

// GetValidCodes returns a slice of all valid country codes for validation
func (s *CountryService) GetValidCodes() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	codes := make([]string, len(s.cache))
	for i, c := range s.cache {
		codes[i] = c.Code
	}
	return codes
}

// fetchFromAPI fetches countries from restcountries.com
func (s *CountryService) fetchFromAPI() ([]Country, error) {
	url := "https://restcountries.com/v3.1/all?fields=name,cca2"

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var apiResponse []restCountryResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Convert to our Country type
	countries := make([]Country, 0, len(apiResponse))
	for _, rc := range apiResponse {
		if rc.CCA2 != "" && rc.Name.Common != "" {
			countries = append(countries, Country{
				Code: strings.ToLower(rc.CCA2),
				Name: rc.Name.Common,
			})
		}
	}

	// Sort alphabetically by name
	sort.Slice(countries, func(i, j int) bool {
		return countries[i].Name < countries[j].Name
	})

	log.Printf("Fetched %d countries from restcountries.com", len(countries))
	return countries, nil
}
