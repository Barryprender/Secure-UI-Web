# Secure-UI Showcase (Go)

A server-first web application built with Go, Templ, and SQLite. Demonstrates secure web development patterns with progressive enhancement via the [secure-ui-components](../secure-ui-components/) web component library.

## Features

- **Server-first** — full functionality without JavaScript, progressive enhancement when JS is available
- **Session-based auth** — login, registration, logout with bcrypt password hashing
- **CSRF protection** — single-use tokens on all forms and API mutations
- **CSP with nonces** — strict Content Security Policy, no `unsafe-inline`
- **Rate limiting** — per-IP request throttling (100 req/min)
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **View Transitions API** — smooth cross-document page transitions (Chrome 126+, Safari 18.2+)
- **Styled error pages** — 404, 500, 503 and all common HTTP errors
- **SQLite database** — pure Go driver, WAL mode, no CGO required
- **Single binary** — zero runtime dependencies, deploy anywhere

## Prerequisites

- [Go 1.24+](https://go.dev/doc/install)
- [templ](https://templ.guide/) — `go install github.com/a-h/templ/cmd/templ@latest`
- Ensure `$(go env GOPATH)/bin` is in your PATH

## Quick Start

```bash
# Install dependencies
make install

# Generate templ templates
make generate

# Start the server
make run
```

Open **http://localhost:8080**

For development with hot reload:

```bash
make dev
```

## Project Structure

```
secure-ui-showcase-go/
├── cmd/server/
│   └── main.go                    # Entry point, routing, middleware chain
├── internal/
│   ├── database/                  # SQLite init, schema, seeding
│   ├── handlers/                  # HTTP handlers
│   │   ├── handlers.go            # Shared helpers, CSRF
│   │   ├── auth.go                # Login, register, logout, profile
│   │   ├── errors.go              # Styled error page rendering
│   │   ├── pages.go               # Page handlers (home, forms, docs)
│   │   └── users.go               # User CRUD, dashboard, table
│   ├── middleware/                 # Security middleware
│   │   ├── security.go            # CSP, CSRF, rate limiting, nonces
│   │   └── auth.go                # Session auth, RequireAuth, OptionalAuth
│   ├── models/                    # Database models
│   │   ├── user.go                # User model + queries
│   │   ├── session.go             # Session model + queries
│   │   └── login_attempt.go       # Login attempt tracking
│   ├── services/                  # Business logic
│   │   └── auth.go                # Auth service (bcrypt, sessions, lockout)
│   ├── templates/                 # Templ templates
│   │   ├── layout.templ           # Base layout (nav, footer, assets)
│   │   ├── partials/              # Navbar, footer
│   │   └── pages/                 # Page templates
│   └── validation/                # Server-side input validation
├── static/
│   ├── styles/                    # CSS (tokens, base, nav, forms, etc.)
│   └── js/                        # View transitions, Prism.js
├── data/                          # SQLite database (auto-created)
├── Makefile
└── go.mod
```

## Routes

### Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | — | Home page |
| `/forms` | — | Form components demo |
| `/documentation` | — | Component documentation |
| `/registration` | — | User registration |
| `/login` | — | Login page |
| `/register` | — | Registration (alias) |
| `/dashboard` | Required | User management dashboard |
| `/table` | Required | Data table with delete confirmation |
| `/profile` | Required | User profile |

### API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/countries` | Country list |
| POST | `/api/forms/submit` | Form submission with validation |

All POST/PUT/DELETE routes require a valid `csrf_token`.

## Authentication

Session-based authentication stored in SQLite. Passwords are hashed with bcrypt (cost 12).

**Test account:** `admin@secure-ui.local` / `admin123`

Account lockout activates after 5 failed login attempts within 15 minutes. Sessions expire after 24 hours and are cleaned up automatically.

## Database

SQLite via [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) (pure Go, no CGO). The database is auto-created at `./data/secure-ui.db` on first run and seeded with sample data.

Tables: `users`, `sessions`, `login_attempts`

```bash
# Override database path
DB_PATH=/path/to/db.sqlite make run
```

## Available Commands

```
make install    — Install Go dependencies and tools (templ, air)
make generate   — Compile .templ files to Go code
make dev        — Development server with hot reload (via air)
make build      — Build production binary to bin/
make run        — Run server directly
make clean      — Remove generated files and binaries
make fmt        — Format Go and templ files
make test       — Run tests
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `DB_PATH` | `./data/secure-ui.db` | SQLite database path |
| `SECURE_COOKIE` | `false` | Set `true` for HTTPS (enables `__Host-` cookie prefix) |
| `BEHIND_PROXY` | `false` | Set `true` to trust `X-Forwarded-For` headers |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.24 |
| Routing | `net/http` (stdlib) |
| Templates | [templ](https://templ.guide/) v0.3.977 |
| Database | SQLite via modernc.org/sqlite |
| Auth | bcrypt via golang.org/x/crypto |
| Frontend | [secure-ui-components](../secure-ui-components/) web components |
| Transitions | View Transitions API (CSS cross-document) |

## Licence

MIT
