# API Reference

Complete reference for `MeadowConnectionSQLite`, the SQLite database connection provider for the Meadow data layer.

---

## Class: MeadowConnectionSQLite

Extends `fable-serviceproviderbase`. Manages a connection to a SQLite database file through the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) library.

### Constructor

```javascript
new MeadowConnectionSQLite(pFable, pManifest, pServiceHash)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pFable` | object | A Fable instance |
| `pManifest` | object | Service manifest / options (optional) |
| `pServiceHash` | string | Service identifier |

On construction:

- Sets `serviceType` to `'MeadowConnectionSQLite'`
- Sets `connected` to `false`
- Reads `SQLiteFilePath` from `fable.settings.SQLite` if available

The provider is not connected after construction — call `connectAsync()` to open the database.

---

## Properties

| Property | Type | Description |
|----------|------|-------------|
| [`connected`](#connected) | `boolean` | Whether the database connection is open |
| [`db`](db.md) | `Database \| false` | The raw better-sqlite3 Database instance |
| [`SQLite`](SQLite.md) | `function` | The better-sqlite3 module constructor |
| [`preparedStatement`](preparedStatement.md) | `Database \| Error` | Returns the Database instance if connected |
| [`serviceType`](#servicetype) | `string` | Always `'MeadowConnectionSQLite'` |

### connected

Whether the database connection is open.

**Type:** `boolean`

```javascript
if (_Fable.MeadowSQLiteProvider.connected)
{
	// Safe to use db
}
```

### serviceType

Always `'MeadowConnectionSQLite'`.

**Type:** `string`

---

## Connection Methods

| Method | Description |
|--------|-------------|
| [`connectAsync(fCallback)`](connectAsync.md) | Open the database and enable WAL (recommended) |
| [`connect()`](connect.md) | Synchronous wrapper — logs a race-condition warning |

---

## DDL Methods

| Method | Description |
|--------|-------------|
| [`generateCreateTableStatement(pSchema)`](generateCreateTableStatement.md) | Generate a `CREATE TABLE IF NOT EXISTS` statement |
| [`createTable(pSchema, fCallback)`](createTable.md) | Generate and execute a CREATE TABLE statement |
| [`createTables(pSchema, fCallback)`](createTables.md) | Create multiple tables from a Meadow schema |
| [`generateDropTableStatement(pTableName)`](generateDropTableStatement.md) | Generate a `DROP TABLE IF EXISTS` statement |

---

## Configuration

### Fable Settings

```json
{
	"SQLite":
	{
		"SQLiteFilePath": "./data/myapp.db"
	}
}
```

| Setting | Type | Required | Description |
|---------|------|----------|-------------|
| `SQLiteFilePath` | string | Yes | File path or `:memory:` for in-memory databases |

### Constructor Options

Additional properties passed through to the `better-sqlite3` constructor:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `readonly` | boolean | `false` | Open the database in read-only mode |
| `fileMustExist` | boolean | `false` | Error if the file does not exist |
| `timeout` | number | `5000` | Milliseconds to wait when the database is locked |

Constructor options override Fable settings, allowing multiple provider instances with different database files.

---

## Connection Behavior

### WAL Journal Mode

On successful connection, the provider automatically runs:

```sql
PRAGMA journal_mode = WAL;
```

Write-Ahead Logging provides significantly better concurrent read/write performance compared to SQLite's default rollback journal.

### File Creation

If the database file does not exist, better-sqlite3 creates it automatically. The directory must exist.

### In-Memory Databases

Set `SQLiteFilePath` to `":memory:"` for ephemeral databases:

```javascript
let _Fable = new libFable(
	{
		"SQLite": { "SQLiteFilePath": ":memory:" }
	});
```

In-memory databases are discarded when the connection closes or the process exits.

---

## Column Type Mapping

| Meadow DataType | SQLite Column Definition |
|-----------------|--------------------------|
| `ID` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `GUID` | `TEXT DEFAULT '00000000-0000-0000-0000-000000000000'` |
| `ForeignKey` | `INTEGER NOT NULL DEFAULT 0` |
| `Numeric` | `INTEGER NOT NULL DEFAULT 0` |
| `Decimal` | `REAL` |
| `String` | `TEXT NOT NULL DEFAULT ''` |
| `Text` | `TEXT` |
| `DateTime` | `TEXT` |
| `Boolean` | `INTEGER NOT NULL DEFAULT 0` |

See [Schema & Table Creation](../schema.md) for full details.

---

## Logging

The provider logs connection events through the Fable logging system:

| Event | Level | Message |
|-------|-------|---------|
| Connecting | `info` | `Meadow-Connection-SQLite connecting to file [path].` |
| Connected | `info` | `Meadow-Connection-SQLite successfully connected to SQLite file [path].` |
| Already connected | `error` | `...is already connected - skipping the second connect call.` |
| Missing path | `error` | `...database file path is invalid; SQLiteFilePath must be in either...` |
| Connection error | `error` | `...error connecting to SQLite file [path]: [error]` |
| No callback | `error` | `...connect() called without a callback...` |

---

## Known Limitations

- **No async queries** -- better-sqlite3 is synchronous by design. For CPU-bound workloads, consider running queries in a worker thread.
- **No connection pooling** -- Unlike MySQL/MSSQL, SQLite uses a single database handle. Concurrent access is managed by WAL journaling.
- **No size enforcement** -- SQLite ignores declared column sizes (e.g. `VARCHAR(256)` is treated as `TEXT`).

---

## Related

- [Quickstart Guide](../quickstart.md) -- Get running in five steps
- [Architecture & Design](../architecture.md) -- Lifecycle and data flow diagrams
- [Schema & Table Creation](../schema.md) -- Column type mapping and DDL generation
- [Full Pipeline Example](../examples-pipeline.md) -- End-to-end CRUD walkthrough
