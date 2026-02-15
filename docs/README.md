# Meadow Connection SQLite

A Fable service provider that connects applications to SQLite databases. Wraps [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) and integrates with the Meadow data layer through Fable's dependency injection system.

SQLite databases are single files that require no server process. This makes them ideal for local development, embedded applications, desktop tools, CLI utilities, test suites, and any scenario where a full MySQL or MSSQL server is unnecessary overhead.

## Install

```bash
npm install meadow-connection-sqlite
```

Requires Node.js. The `better-sqlite3` dependency compiles a native addon at install time — a C compiler toolchain must be available on the host.

## Quick Start

### 1. Configure Fable

Add an `SQLite` section to your Fable configuration with the path to the database file. The file is created automatically if it does not exist:

```javascript
const libFable = require('fable');

let _Fable = new libFable(
	{
		"Product": "MyApp",
		"SQLite":
		{
			"SQLiteFilePath": "./data/myapp.db"
		}
	});
```

### 2. Register the Service

```javascript
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');
```

After instantiation the provider is available at `_Fable.MeadowSQLiteProvider`.

### 3. Connect

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}

		// Connection is ready — WAL journaling is enabled automatically
		_Fable.log.info('SQLite connected!');
	});
```

### 4. Query

Access the better-sqlite3 `Database` instance through the `db` getter:

```javascript
let tmpDB = _Fable.MeadowSQLiteProvider.db;

// Create a table
tmpDB.exec(`
	CREATE TABLE IF NOT EXISTS Book (
		IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
		Title TEXT DEFAULT '',
		Author TEXT DEFAULT ''
	)
`);

// Insert a row
let tmpResult = tmpDB.prepare('INSERT INTO Book (Title, Author) VALUES (?, ?)').run('Dune', 'Frank Herbert');
console.log(`Inserted IDBook = ${tmpResult.lastInsertRowid}`);

// Query rows
let tmpBooks = tmpDB.prepare('SELECT * FROM Book').all();
console.log(tmpBooks);
```

## Configuration

The provider reads `SQLiteFilePath` from two sources, in order of priority:

1. **Constructor options** — passed as the second argument to `instantiateServiceProvider()`
2. **Fable settings** — `fable.settings.SQLite.SQLiteFilePath`

| Setting | Type | Description |
|---------|------|-------------|
| `SQLiteFilePath` | string | Path to the database file. Use `:memory:` for an ephemeral in-memory database. |

Any additional properties in the options object are passed through to the `better-sqlite3` constructor (e.g. `readonly`, `fileMustExist`, `timeout`).

### In-Memory Databases

Pass `:memory:` as the file path for a database that exists only in RAM. This is useful for fast test suites:

```javascript
let _Fable = new libFable(
	{
		"Product": "TestSuite",
		"SQLite": { "SQLiteFilePath": ":memory:" }
	});
```

## How It Works

```
┌─────────────────────────────┐
│  Fable Application          │
│                             │
│  fable.settings.SQLite      │
│   └── SQLiteFilePath        │
└───────────┬─────────────────┘
            │ connectAsync()
            ▼
┌─────────────────────────────┐
│  MeadowConnectionSQLite     │
│  (Fable Service Provider)   │
│                             │
│  .connected                 │
│  .db ──────────────────┐    │
│  .SQLite               │    │
└────────────────────────┼────┘
                         │
            ┌────────────▼────────────┐
            │  better-sqlite3         │
            │                         │
            │  .prepare(sql).run()    │
            │  .prepare(sql).get()    │
            │  .prepare(sql).all()    │
            │  .exec(sql)             │
            │  .transaction(fn)       │
            │  .pragma(str)           │
            └─────────────────────────┘
```

The provider manages the connection lifecycle and exposes the raw `better-sqlite3` `Database` object. All queries go through better-sqlite3's synchronous API — there are no promises or callbacks for individual statements.

## Companion Modules

| Module | Purpose |
|--------|---------|
| [Meadow](/meadow/meadow/) | ORM and data access layer |
| [FoxHound](/meadow/foxhound/) | Query DSL and SQL generation |
| [meadow-connection-mysql](/meadow/meadow-connection-mysql/) | MySQL connection provider |
| [meadow-connection-mssql](/meadow/meadow-connection-mssql/) | MSSQL connection provider |
