.PHONY: help install components generate dev build run clean fmt test download-prism

# Default target
help:
	@echo "Secure-UI Showcase (Go + Templ) - Available commands:"
	@echo ""
	@echo "  make install        - Install Go dependencies and tools (templ, air)"
	@echo "  make components     - Update secure-ui-components to latest, sync dist/, update lock file"
	@echo "  make generate       - Generate Go code from templ templates"
	@echo "  make dev            - Start development server with hot reload"
	@echo "  make build          - Build production binary"
	@echo "  make run            - Run the server (without hot reload)"
	@echo "  make clean          - Remove generated files and binaries"
	@echo "  make fmt            - Format Go code and templ templates"
	@echo "  make test           - Run tests"
	@echo "  make download-prism - Download Prism.js syntax highlighting files"
	@echo ""

# Install all dependencies (Go tools + web components)
install: components
	@echo "📦 Installing Go dependencies..."
	go mod download
	@echo "📦 Installing templ CLI..."
	go install github.com/a-h/templ/cmd/templ@latest
	@echo "📦 Installing air (hot reload)..."
	go install github.com/cosmtrek/air@latest
	@echo "✅ Installation complete!"
	@echo ""
	@echo "Make sure $$(go env GOPATH)/bin is in your PATH"
	@echo "Run 'make generate' to generate templ files"

# Fetch latest web components from npm, update package-lock.json, sync dist/
# Commit package-lock.json after running this so Docker uses the same version.
components:
	@echo "📦 Updating secure-ui-components to latest..."
	npm install secure-ui-components@latest
	@echo "📦 Syncing dist files..."
	npm run sync
	@echo "✅ Components ready at secure-ui-components/dist/"
	@echo "   Commit package-lock.json to lock this version for Docker builds."

# Generate templ templates to Go code
generate:
	@echo "🔨 Generating templ templates..."
	templ generate
	@echo "✅ Templates generated!"

# Development mode with hot reload
dev: generate
	@echo "🚀 Starting development server with hot reload..."
	@echo "📡 Server will be available at http://localhost:8080"
	@echo "🔥 Watching for changes in .go and .templ files..."
	@echo ""
	air

# Build production binary
build: generate
	@echo "🔨 Building production binary..."
	go build -o bin/showcase-server cmd/server/main.go
	@echo "✅ Binary built: bin/showcase-server"

# Run the server without hot reload
run: generate
	@echo "🚀 Starting server..."
	go run cmd/server/main.go

# Clean generated files and binaries
clean:
	@echo "🧹 Cleaning generated files..."
	rm -rf bin/
	rm -rf tmp/
	find . -name "*_templ.go" -delete
	@echo "✅ Cleaned!"

# Format code
fmt:
	@echo "✨ Formatting Go code..."
	go fmt ./...
	@echo "✨ Formatting templ templates..."
	templ fmt .
	@echo "✅ Formatting complete!"

# Run tests
test:
	@echo "🧪 Running tests..."
	go test -v ./...

# Download Prism.js syntax highlighting files
download-prism:
	@echo "📥 Downloading Prism.js files..."
	go run scripts/download_prism.go
	@echo "✅ Prism.js downloaded successfully!"
