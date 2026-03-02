# connectAsync(fCallback)

Opens a connection to the SQLite database file specified in configuration. This is the recommended way to connect.

## Signature

```javascript
connectAsync(fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `function` | Callback receiving `(error, database)` |

## Return Value

None. Results are delivered via the callback.

## Callback Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pError` | `Error \| null` | Error object if connection failed, `null` on success |
| `pDatabase` | `Database` | The better-sqlite3 Database instance |

## Behavior

1. If `SQLiteFilePath` is not configured, calls back with an error immediately
2. If already connected, logs an error and calls back with the existing database (idempotent)
3. Creates a new `better-sqlite3` Database instance at the configured file path
4. The database file is created automatically if it does not exist
5. Enables WAL (Write-Ahead Logging) journal mode for performance
6. Sets `this.connected = true` on success

## Basic Usage

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}

		// pDatabase is the same as _Fable.MeadowSQLiteProvider.db
		let tmpBooks = pDatabase.prepare('SELECT * FROM Book').all();
		console.log(`Found ${tmpBooks.length} books`);
	});
```

## Double-Connect Guard

Calling `connectAsync()` on an already-connected provider logs an error but does not throw. It returns the existing database:

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		// First connection — succeeds normally

		_Fable.MeadowSQLiteProvider.connectAsync(
			(pError, pDatabase2) =>
			{
				// Logs: "...is already connected - skipping the second connect call."
				// pDatabase2 is the same instance as pDatabase
			});
	});
```

## Missing File Path

If `SQLiteFilePath` is not set in either the constructor options or Fable settings:

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		// pError contains: "...database file path is invalid;
		// SQLiteFilePath must be in either fable.settings.SQLite
		// or passed as an option to the service provider."
	});
```

## In-Memory Database

Use `:memory:` for ephemeral databases that exist only in RAM:

```javascript
let _Fable = new libFable(
	{
		"SQLite": { "SQLiteFilePath": ":memory:" }
	});

// ... register and instantiate provider ...

_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		// Database exists only in memory
		// Discarded when the connection closes or process exits
	});
```

## Missing Callback Warning

If `connectAsync()` is called without a callback, the provider logs an error:

```
Meadow-Connection-SQLite connect() called without a callback; this could
result in race conditions — use connectAsync(callback) instead.
```

## Related

- [connect](connect.md) -- Synchronous wrapper (not recommended)
- [db](db.md) -- Access the database after connecting
- [pool](../api/reference.md) -- Full API reference
