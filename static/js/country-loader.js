/**
 * Country Loader
 * Fetches countries from the API and populates the country select component
 */
(function() {
    'use strict';

    async function loadCountries() {
        const countrySelect = document.querySelector('secure-select[name="country"]');
        if (!countrySelect) {
            return;
        }

        try {
            const response = await fetch('/api/countries');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.data) {
                throw new Error('Invalid response format');
            }

            // Clear existing options and add new ones
            countrySelect.clearOptions();
            countrySelect.addOption('', 'Select a country');

            for (const country of data.data) {
                countrySelect.addOption(country.code, country.name);
            }

            console.log(`Loaded ${data.data.length} countries`);
        } catch (error) {
            console.error('Failed to load countries:', error);
            // Fallback options remain from server-rendered HTML
        }
    }

    // Load countries when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadCountries);
    } else {
        loadCountries();
    }
})();
