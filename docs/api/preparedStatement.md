# preparedStatement (getter)

Returns the `better-sqlite3` Database instance if connected. Throws an error if the provider is not connected.

## Signature

```javascript
get preparedStatement()
```

## Return Value

| Type | Description |
|------|-------------|
| `Database` | The better-sqlite3 Database instance (when connected) |

## Error Conditions

Throws an error if the database is not connected:

```
The Meadow SQLite provider could not create a prepared statement;
disconnected or no valid connection pool.
```

## Why This Exists

The `preparedStatement` getter exists for API symmetry with the MSSQL connection provider, which returns a new `mssql.PreparedStatement` bound to the connection pool. In the SQLite provider, prepared statements are created directly on the Database instance via `db.prepare()`, so this getter simply returns the `db` handle itself.

This allows code that references `provider.preparedStatement` to work across different Meadow connection providers.

## Usage

```javascript
let tmpDB = _Fable.MeadowSQLiteProvider.preparedStatement;

// Create and use a prepared statement
let tmpStmt = tmpDB.prepare('SELECT * FROM Book WHERE IDBook = ?');
let tmpBook = tmpStmt.get(42);
```

## Comparison with db Getter

| Getter | Before Connection | After Connection |
|--------|-------------------|------------------|
| `db` | Returns `false` | Returns Database instance |
| `preparedStatement` | Throws Error | Returns Database instance |

Use `db` when you want to check for connection state gracefully. Use `preparedStatement` when you want a hard failure if the database is not connected.

## Comparison with MSSQL Provider

```javascript
// MSSQL — each access creates a new PreparedStatement
let tmpPS = _Fable.MeadowMSSQLProvider.preparedStatement;
tmpPS.input('id', _Fable.MeadowMSSQLProvider.MSSQL.Int);
tmpPS.prepare('SELECT * FROM Book WHERE IDBook = @id', ...);

// SQLite — returns the Database handle (prepare directly)
let tmpDB = _Fable.MeadowSQLiteProvider.preparedStatement;
let tmpStmt = tmpDB.prepare('SELECT * FROM Book WHERE IDBook = ?');
```

## Related

- [db](db.md) -- Primary database getter (returns `false` before connection)
- [connectAsync](connectAsync.md) -- Open the database connection first
