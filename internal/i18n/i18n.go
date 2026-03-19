package i18n

import (
	"context"
	"net/http"
	"strings"
	"time"
)

// Locale is a supported language tag.
type Locale string

const (
	EN Locale = "en"
	ES Locale = "es"
	FR Locale = "fr"
	DE Locale = "de"
)

// Supported lists all recognized locales in display order.
var Supported = []Locale{EN, ES, FR, DE}

// Label returns the short display label for a locale button.
var Label = map[Locale]string{
	EN: "EN",
	ES: "ES",
	FR: "FR",
	DE: "DE",
}

type localeKey struct{}

// LocaleFromContext returns the active locale, defaulting to EN.
func LocaleFromContext(ctx context.Context) Locale {
	if l, ok := ctx.Value(localeKey{}).(Locale); ok {
		return l
	}
	return EN
}

// T looks up a translation key for the locale in ctx, falling back to EN, then the key itself.
func T(ctx context.Context, key string) string {
	return Lookup(LocaleFromContext(ctx), key)
}

// Lookup resolves a key for a given locale with EN fallback.
func Lookup(locale Locale, key string) string {
	if msgs, ok := translations[key]; ok {
		if msg, ok := msgs[locale]; ok && msg != "" {
			return msg
		}
		if msg, ok := msgs[EN]; ok {
			return msg
		}
	}
	return key
}

// Middleware detects the user's preferred locale via cookie, then Accept-Language header.
func Middleware(next http.Handler) http.Handler {
	supported := make(map[string]Locale, len(Supported))
	for _, l := range Supported {
		supported[string(l)] = l
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		locale := detect(r, supported)
		ctx := context.WithValue(r.Context(), localeKey{}, locale)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func detect(r *http.Request, supported map[string]Locale) Locale {
	// 1. Cookie overrides everything.
	if c, err := r.Cookie("lang"); err == nil {
		if l, ok := supported[c.Value]; ok {
			return l
		}
	}
	// 2. Accept-Language header — take the first matching tag.
	al := r.Header.Get("Accept-Language")
	for _, part := range strings.FieldsFunc(al, func(r rune) bool { return r == ',' }) {
		tag := strings.TrimSpace(strings.SplitN(part, ";", 2)[0])
		if len(tag) >= 2 {
			if l, ok := supported[strings.ToLower(tag[:2])]; ok {
				return l
			}
		}
	}
	return EN
}

// SetCookie writes the lang preference cookie to the response.
func SetCookie(w http.ResponseWriter, locale Locale, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     "lang",
		Value:    string(locale),
		Path:     "/",
		MaxAge:   int((365 * 24 * time.Hour).Seconds()),
		HttpOnly: false,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}
