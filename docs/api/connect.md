# connect()

Synchronous convenience wrapper that calls `connectAsync()` without a callback. Logs a warning about potential race conditions.

## Signature

```javascript
connect()
```

## Parameters

None.

## Return Value

None.

## Behavior

Calls `connectAsync()` internally without passing a callback. The provider logs a warning:

```
Meadow-Connection-SQLite connect() called without a callback; this could
result in race conditions — use connectAsync(callback) instead.
```

## Why This Exists

`connect()` is provided for legacy compatibility and quick prototyping. Because the underlying better-sqlite3 library opens databases synchronously, the connection actually completes immediately — but the method still logs a warning because the Fable service pattern expects asynchronous lifecycle management.

## Usage

```javascript
_Fable.MeadowSQLiteProvider.connect();

// The database is ready immediately (better-sqlite3 is synchronous)
// but the warning is logged to encourage using connectAsync() instead
if (_Fable.MeadowSQLiteProvider.connected)
{
	let tmpDB = _Fable.MeadowSQLiteProvider.db;
	tmpDB.exec('CREATE TABLE IF NOT EXISTS Test (id INTEGER PRIMARY KEY)');
}
```

## Recommended Alternative

Always prefer `connectAsync()` for production code:

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}
		// Safe to use the database here
	});
```

## Related

- [connectAsync](connectAsync.md) -- Recommended connection method
- [db](db.md) -- Access the database after connecting
