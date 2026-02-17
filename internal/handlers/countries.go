package handlers

import (
	"net/http"
)

// GetCountries returns a list of all countries
func (h *Handlers) GetCountries(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	countries, err := h.CountryService.GetAll()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Unable to load countries")
		return
	}

	writeSuccess(w, http.StatusOK, "", countries)
}
