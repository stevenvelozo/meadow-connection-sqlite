# API Reference

## Class: MeadowConnectionSQLite

Extends `fable-serviceproviderbase`. Manages a connection to a SQLite database file through the better-sqlite3 library.

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

The provider is not yet connected after construction — call `connectAsync()` to open the database.

---

## Properties

### connected

Whether the database connection is open.

**Type:** `boolean`

### db

The raw `better-sqlite3` `Database` instance. Use this for all query operations. Returns `false` before `connectAsync()` is called.

**Type:** `Database | false`

```javascript
let tmpDB = _Fable.MeadowSQLiteProvider.db;

// Synchronous query methods from better-sqlite3:
tmpDB.prepare(sql).run(params);    // INSERT, UPDATE, DELETE
tmpDB.prepare(sql).get(params);    // SELECT single row
tmpDB.prepare(sql).all(params);    // SELECT all rows
tmpDB.exec(sql);                   // Execute raw SQL (multi-statement)
tmpDB.transaction(fn);             // Wrap a function in a transaction
tmpDB.pragma(string);              // Run a PRAGMA command
tmpDB.close();                     // Close the database
```

### SQLite

Reference to the `better-sqlite3` module constructor. Useful for accessing type constants or creating additional database instances.

**Type:** `function`

```javascript
let tmpSQLiteConstructor = _Fable.MeadowSQLiteProvider.SQLite;
```

### serviceType

Always `'MeadowConnectionSQLite'`.

**Type:** `string`

---

## Methods

### connectAsync(fCallback)

Open a connection to the SQLite database file specified in configuration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | function | Callback: `(error, database)` |

**Behavior:**

- If `SQLiteFilePath` is not configured, calls back with an error
- If already connected, calls back immediately with the existing database (idempotent)
- Creates the database file if it does not exist
- Enables WAL (Write-Ahead Logging) journal mode for performance
- Sets `this.connected = true` on success

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
		pDatabase.exec('CREATE TABLE IF NOT EXISTS Test (id INTEGER PRIMARY KEY)');
	});
```

### connect()

Synchronous wrapper that calls `connectAsync()` without a callback. Logs a warning about potential race conditions. Prefer `connectAsync()`.

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

Additional properties are passed through to the `better-sqlite3` constructor:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `readonly` | boolean | `false` | Open the database in read-only mode |
| `fileMustExist` | boolean | `false` | Error if the file does not exist |
| `timeout` | number | `5000` | Milliseconds to wait when the database is locked |

---

## Service Registration

The provider integrates with Fable's service manager:

```javascript
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

// Register the service type
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);

// Instantiate (optionally with per-instance options)
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider',
	{
		SQLiteFilePath: './data/alternate.db',
		readonly: true
	});

// Access the provider
_Fable.MeadowSQLiteProvider.connectAsync((pError) => { /* ... */ });
```

Constructor options override Fable settings, allowing multiple providers with different configurations.

---

## better-sqlite3 Query API

After connecting, all queries go through the `db` getter. Here is a quick reference for the better-sqlite3 methods you will use most:

### Execute Raw SQL

```javascript
tmpDB.exec(`
	CREATE TABLE IF NOT EXISTS Book (
		IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
		Title TEXT DEFAULT ''
	);
	CREATE INDEX IF NOT EXISTS idx_book_title ON Book(Title);
`);
```

`exec()` runs one or more SQL statements. It does not return data.

### Prepared Statements

```javascript
let tmpStmt = tmpDB.prepare('SELECT * FROM Book WHERE Author = ?');

// Single row
let tmpRow = tmpStmt.get('Frank Herbert');

// All rows
let tmpRows = tmpStmt.all('Frank Herbert');

// Modification
let tmpInsert = tmpDB.prepare('INSERT INTO Book (Title, Author) VALUES (?, ?)');
let tmpInfo = tmpInsert.run('Dune', 'Frank Herbert');
// tmpInfo.changes = 1, tmpInfo.lastInsertRowid = 1
```

### Named Parameters

```javascript
let tmpStmt = tmpDB.prepare('SELECT * FROM Book WHERE Author = @author AND YearPublished > @year');
let tmpRows = tmpStmt.all({ author: 'Isaac Asimov', year: 1950 });
```

### Transactions

```javascript
let tmpBulkInsert = tmpDB.transaction(
	(pBooks) =>
	{
		let tmpStmt = tmpDB.prepare('INSERT INTO Book (Title, Author) VALUES (?, ?)');
		for (let tmpBook of pBooks)
		{
			tmpStmt.run(tmpBook.Title, tmpBook.Author);
		}
	});

// The entire array is inserted atomically
tmpBulkInsert([
	{ Title: 'Foundation', Author: 'Isaac Asimov' },
	{ Title: 'Snow Crash', Author: 'Neal Stephenson' }
]);
```

If any statement inside the transaction throws, the entire transaction is rolled back automatically.

### Close

```javascript
tmpDB.close();
```

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

- **Table generation** — The `generateCreateTableStatement()` and `createTable()` methods produce MSSQL-syntax SQL that is not compatible with SQLite. Use `db.exec()` with SQLite-native `CREATE TABLE` statements instead.
- **Prepared statement getter** — The `preparedStatement` property references an uninitialized connection pool. Use `db.prepare()` directly for prepared statements.
- **No async queries** — better-sqlite3 is synchronous by design. For CPU-bound workloads, consider running queries in a worker thread.
