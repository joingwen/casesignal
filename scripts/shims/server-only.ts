// Test/CLI shim. The real `server-only` package throws when loaded outside a
// React Server Component graph; scripts and unit tests legitimately import
// server modules directly, so they map the specifier here instead.
export {}
