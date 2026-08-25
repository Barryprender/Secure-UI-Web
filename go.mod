module secure-ui-showcase-go

go 1.25.0

// Build floor, not just a language version. Everything from 1.24.0 up to
// 1.25.12 leaves vulnerabilities govulncheck flags as *called* from this
// server's own request path: crypto/tls and net/http reachable from
// ListenAndServe, net/url from every http.Redirect the auth handlers issue,
// net/mail and net/textproto from the header handling. 1.25.13 clears all 23.
//
// Raise this to track the latest patch. The Dockerfile pins the same version,
// so a rebuild cannot regress to an older toolchain, and CI runs govulncheck so
// a new advisory against the pinned version fails the build rather than
// shipping quietly to secure-ui-web.fly.dev.
toolchain go1.25.13

require (
	github.com/a-h/templ v0.3.1001
	github.com/andybalholm/brotli v1.2.1
	github.com/microcosm-cc/bluemonday v1.0.27
	golang.org/x/crypto v0.51.0
	modernc.org/sqlite v1.44.3
)

require (
	github.com/aymerick/douceur v0.2.0 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/gorilla/css v1.0.1 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/ncruces/go-strftime v1.0.0 // indirect
	github.com/remyoudompheng/bigfft v0.0.0-20230129092748-24d4a6f8daec // indirect
	golang.org/x/exp v0.0.0-20251023183803-a4bb9ffd2546 // indirect
	golang.org/x/net v0.55.0 // indirect
	golang.org/x/sys v0.45.0 // indirect
	modernc.org/libc v1.67.6 // indirect
	modernc.org/mathutil v1.7.1 // indirect
	modernc.org/memory v1.11.0 // indirect
)
