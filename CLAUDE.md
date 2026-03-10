# Project: secure-ui-showcase-go

## Sources of Truth
- https://go.dev/
- https://go.dev/doc/effective_go
- https://go.dev/doc/code (Go Code Review Comments)
- https://go.dev/ref/spec

## Hard Rules
- Write idiomatic, minimal, maintainable Go
- Prefer clarity over abstraction
- Avoid frameworks unless explicitly requested
- Avoid reflection, globals, and clever tricks
- Handle errors explicitly — no ignored errors
- Use context.Context correctly (pass as first arg, never store)
- Use interfaces sparingly — only when polymorphism is needed
- Avoid unnecessary generics

## Output Rules
- Code must compile
- Concise but readable
- No over-engineering
- No emojis
- No explanations unless requested
- If a best practice is violated, justify it explicitly
- Refuse requests that would lead to poor Go code
