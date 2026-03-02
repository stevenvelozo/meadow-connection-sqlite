# SQLite (getter)

Returns the `better-sqlite3` module constructor for direct access to the underlying library.

## Signature

```javascript
get SQLite()
```

## Return Value

| Type | Description |
|------|-------------|
| `function` | The `better-sqlite3` module (Database constructor) |

## Primary Use

The `SQLite` getter provides access to the raw `better-sqlite3` module. This is useful for:

- Creating additional database instances outside the provider
- Accessing `better-sqlite3` constants or utilities
- Type checking against the constructor

```javascript
let tmpSQLiteConstructor = _Fable.MeadowSQLiteProvider.SQLite;
```

## Creating an Additional Database

```javascript
let tmpSQLite = _Fable.MeadowSQLiteProvider.SQLite;

// Open a second database independently
let tmpSecondDB = new tmpSQLite('./data/secondary.db');
tmpSecondDB.pragma('journal_mode = WAL');

let tmpRows = tmpSecondDB.prepare('SELECT * FROM Log').all();

tmpSecondDB.close();
```

## Comparison with db Getter

| Getter | Returns | Purpose |
|--------|---------|---------|
| `db` | Database instance | The connected database for queries |
| `SQLite` | Module constructor | The better-sqlite3 library itself |

The `db` getter returns the database handle opened by `connectAsync()`. The `SQLite` getter returns the library that creates those handles.

## Related

- [db](db.md) -- The connected database instance for queries
- [connectAsync](connectAsync.md) -- Open the database connection
