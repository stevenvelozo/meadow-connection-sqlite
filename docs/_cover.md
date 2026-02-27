# Meadow Connection SQLite

> SQLite database provider for the Meadow data layer

Connect any Fable application to a local SQLite database through the service provider pattern. Built on better-sqlite3 for fast synchronous access with WAL journaling, automatic file creation, and in-memory database support.

- **Zero Config Server** -- No daemon, no Docker — just a file path and you have a database
- **Synchronous API** -- All queries run synchronously through better-sqlite3's native bindings
- **WAL Journaling** -- Write-Ahead Logging enabled automatically for concurrent read/write performance
- **In-Memory Mode** -- Use `:memory:` as the file path for ephemeral databases in tests and prototypes
- **Service Integration** -- Registers as a Fable service with dependency injection and lifecycle logging

[Quick Start](README.md)
[API Reference](api.md)
[GitHub](https://github.com/stevenvelozo/meadow-connection-sqlite)
