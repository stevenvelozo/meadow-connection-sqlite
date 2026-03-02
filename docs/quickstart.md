# Quickstart

Get a SQLite database connected and running in five steps.

---

## Step 1 — Install

```bash
npm install meadow-connection-sqlite fable
```

`better-sqlite3` compiles a native addon at install time. A C/C++ toolchain must be available on the host (GCC, Clang, or MSVC).

---

## Step 2 — Configure and Connect

```javascript
const libFable = require('fable');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

let _Fable = new libFable(
	{
		"Product": "BookstoreApp",
		"ProductVersion": "1.0.0",
		"SQLite":
		{
			"SQLiteFilePath": "./data/bookstore.db"
		}
	});

_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			console.error('Connection failed:', pError);
			return;
		}

		console.log('Connected:', _Fable.MeadowSQLiteProvider.connected);
		// => Connected: true
	});
```

The database file is created automatically if it does not exist. WAL journal mode is enabled on connection.

For in-memory databases (useful in tests), set `SQLiteFilePath` to `":memory:"`.

---

## Step 3 — Run Queries

All queries use the synchronous `better-sqlite3` API via the `db` getter:

```javascript
let tmpDB = _Fable.MeadowSQLiteProvider.db;

// Create a table with raw SQL
tmpDB.exec(`
	CREATE TABLE IF NOT EXISTS Book (
		IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
		Title TEXT DEFAULT '',
		Author TEXT DEFAULT '',
		Price REAL DEFAULT 0.0
	)
`);

// Insert a row with a prepared statement
let tmpInsert = tmpDB.prepare(
	'INSERT INTO Book (Title, Author, Price) VALUES (?, ?, ?)'
);
let tmpResult = tmpInsert.run('Dune', 'Frank Herbert', 14.99);
console.log('Inserted ID:', tmpResult.lastInsertRowid);
// => Inserted ID: 1

// Query all rows
let tmpBooks = tmpDB.prepare('SELECT * FROM Book').all();
console.log(tmpBooks);
// => [{ IDBook: 1, Title: 'Dune', Author: 'Frank Herbert', Price: 14.99 }]

// Query a single row
let tmpBook = tmpDB.prepare('SELECT * FROM Book WHERE IDBook = ?').get(1);
console.log(tmpBook.Title);
// => Dune
```

### Key Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `db.exec(sql)` | nothing | Run DDL or multi-statement SQL |
| `db.prepare(sql).run(...)` | `{ changes, lastInsertRowid }` | INSERT, UPDATE, DELETE |
| `db.prepare(sql).get(...)` | object or `undefined` | SELECT single row |
| `db.prepare(sql).all(...)` | array of objects | SELECT all matching rows |
| `db.transaction(fn)` | wrapped function | Atomic batch operations |

---

## Step 4 — Create Tables from Schema

Instead of writing DDL by hand, pass a Meadow table schema to `createTable()`:

```javascript
let tmpBookSchema =
{
	TableName: 'Book',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '256' },
		{ Column: 'Author', DataType: 'String', Size: '128' },
		{ Column: 'YearPublished', DataType: 'Numeric' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'InPrint', DataType: 'Boolean' },
		{ Column: 'CreateDate', DataType: 'DateTime' },
		{ Column: 'UpdateDate', DataType: 'DateTime' }
	]
};

_Fable.MeadowSQLiteProvider.createTable(tmpBookSchema,
	(pError) =>
	{
		if (pError) { console.error('Create table failed:', pError); return; }
		console.log('Table created!');
	});
```

You can also generate the DDL string without executing it:

```javascript
let tmpDDL = _Fable.MeadowSQLiteProvider.generateCreateTableStatement(tmpBookSchema);
console.log(tmpDDL);
```

Output:

```sql
CREATE TABLE IF NOT EXISTS Book (IDBook INTEGER PRIMARY KEY AUTOINCREMENT, GUIDBook TEXT DEFAULT '00000000-0000-0000-0000-000000000000', Title TEXT NOT NULL DEFAULT '', Author TEXT NOT NULL DEFAULT '', YearPublished INTEGER NOT NULL DEFAULT 0, Price REAL, InPrint INTEGER NOT NULL DEFAULT 0, CreateDate TEXT, UpdateDate TEXT);
```

---

## Step 5 — Meadow ORM Integration

Wire the SQLite connection into Meadow for full ORM capabilities:

```javascript
const libMeadow = require('meadow');

let tmpBookMeadow = libMeadow.new(_Fable, 'FableTest')
	.setProvider('ALASQL')
	.setDefaultIdentifier('IDBook')
	.loadFromPackage(
		{
			scope: 'Book',
			jsonschema:
			{
				title: 'Book',
				properties:
				{
					IDBook: { type: 'integer' },
					GUIDBook: { type: 'string' },
					Title: { type: 'string' },
					Author: { type: 'string' }
				}
			}
		});
```

> **Note:** Meadow uses FoxHound dialects for query generation. For SQLite-specific workloads that bypass Meadow's query layer, use the `db` getter directly. The ALASQL provider is commonly paired with SQLite for local Meadow operations.

---

## Summary

| Step | What It Does |
|------|-------------|
| Install | `npm install meadow-connection-sqlite fable` |
| Configure | Set `SQLite.SQLiteFilePath` in Fable settings |
| Connect | `connectAsync()` opens the file and enables WAL |
| Query | `db.prepare().run/get/all()` for synchronous queries |
| Schema DDL | `createTable()` generates and executes SQLite DDL |

---

## Next Steps

- [Architecture & Design](architecture.md) -- Connection lifecycle and data flow diagrams
- [Full Pipeline Example](examples-pipeline.md) -- End-to-end CRUD pipeline with transactions
- [API Reference](api/reference.md) -- Complete reference for every property and method
- [Schema & Table Creation](schema.md) -- Column type mapping and DDL generation
