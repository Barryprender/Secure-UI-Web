# syntax=docker/dockerfile:1

# ── Stage 1: Fetch web components from npm ────────────────────────────────────
FROM node:22-alpine AS components

WORKDIR /components
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build Go binary ──────────────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /src

# Install templ CLI
RUN go install github.com/a-h/templ/cmd/templ@v0.3.977

# Fetch dependencies before copying source (improves layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy full source
COPY . .

# Generate templ templates → *_templ.go (excluded from git)
RUN templ generate

# Build static binary — modernc.org/sqlite is pure Go, no CGO needed
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" \
    -o /out/server ./cmd/server

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM alpine:3.21

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Binary
COPY --from=builder /out/server ./server

# Static CSS / JS / images
COPY --chown=app:app static/ ./static/

# Built web components (from npm package)
COPY --from=components --chown=app:app /components/node_modules/secure-ui-components/dist/ ./secure-ui-components/dist/

# Data directory — will be replaced by a Fly volume mount at /app/data
RUN mkdir -p /app/data && chown app:app /app/data

USER app

EXPOSE 8080

CMD ["./server"]
