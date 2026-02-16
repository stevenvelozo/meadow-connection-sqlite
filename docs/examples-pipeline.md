# Full Pipeline Example

This walkthrough builds a complete CRUD pipeline from scratch: configure Fable, connect to SQLite, create a schema, insert rows, query, update, delete, run a transaction, and compute aggregates. Every snippet below has been executed and verified against meadow-connection-sqlite.

> The full script is available at `debug/Pipeline-Test.js` in the module repository.

---

## Setup

```javascript
const libFable = require('fable');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

let _Fable = new libFable(
	{
		"Product": "BookstoreExample",
		"ProductVersion": "1.0.0",
		"UUID": { "DataCenter": 0, "Worker": 0 },
		"LogStreams": [{ "streamtype": "console" }],
		"SQLite": { "SQLiteFilePath": "./dist/Bookstore.db" }
	});

_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');
```

---

## Step 1: Connect

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			return;
		}

		_Fable.log.info(`Connected: ${_Fable.MeadowSQLiteProvider.connected}`);
		// => Connected: true

		let tmpDB = _Fable.MeadowSQLiteProvider.db;

		// ... all remaining steps use tmpDB ...
	});
```

The database file is created automatically if it does not exist. WAL journal mode is enabled on connection for better performance.

---

## Step 2: Create a Table

### Using createTable()

Pass a Meadow table schema object to `createTable()` and it generates the correct SQLite DDL automatically:

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
		if (pError) { _Fable.log.error(`Create table failed: ${pError}`); return; }
		// Table is ready for queries
	});
```

### Using raw db.exec()

For tables with custom constraints, expressions, or indexes, use `db.exec()` directly:

```javascript
tmpDB.exec(`
	CREATE TABLE IF NOT EXISTS Book (
		IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
		GUIDBook TEXT DEFAULT '00000000-0000-0000-0000-000000000000',
		Title TEXT DEFAULT '',
		Author TEXT DEFAULT '',
		YearPublished INTEGER DEFAULT 0,
		Price REAL DEFAULT 0.0,
		CreateDate TEXT DEFAULT (datetime('now')),
		UpdateDate TEXT DEFAULT (datetime('now'))
	)
`);
```

**SQLite type mapping:**

| Meadow Type | SQLite Type | Notes |
|-------------|-------------|-------|
| ID | `INTEGER PRIMARY KEY AUTOINCREMENT` | Auto-incrementing primary key |
| GUID | `TEXT` | Store as 36-character UUID string |
| String | `TEXT` | SQLite does not enforce VARCHAR length |
| Numeric / ForeignKey | `INTEGER` | 64-bit signed integer |
| Decimal | `REAL` | 64-bit IEEE floating point |
| Boolean | `INTEGER` | 0 = false, 1 = true |
| DateTime | `TEXT` | ISO-8601 string, e.g. `datetime('now')` |
| Text | `TEXT` | Unlimited length |

---

## Step 3: Insert Rows

Prepared statements with positional parameters:

```javascript
let tmpInsert = tmpDB.prepare(
	`INSERT INTO Book (GUIDBook, Title, Author, YearPublished, Price) VALUES (?, ?, ?, ?, ?)`
);

let tmpResult1 = tmpInsert.run(_Fable.fable.getUUID(), 'The Hobbit', 'J.R.R. Tolkien', 1937, 12.99);
// tmpResult1.lastInsertRowid => 1

let tmpResult2 = tmpInsert.run(_Fable.fable.getUUID(), 'Dune', 'Frank Herbert', 1965, 14.99);
// tmpResult2.lastInsertRowid => 2

let tmpResult3 = tmpInsert.run(_Fable.fable.getUUID(), 'Neuromancer', 'William Gibson', 1984, 11.50);
// tmpResult3.lastInsertRowid => 3
```

The `run()` method returns an object with two properties:

| Property | Type | Description |
|----------|------|-------------|
| `changes` | number | Number of rows affected |
| `lastInsertRowid` | number | Auto-generated ID of the inserted row |

Fable's `getUUID()` generates unique identifiers for the GUID column.

---

## Step 4: Read All Rows

```javascript
let tmpAllBooks = tmpDB.prepare(`SELECT * FROM Book`).all();
// tmpAllBooks.length => 3

for (let i = 0; i < tmpAllBooks.length; i++)
{
	let tmpBook = tmpAllBooks[i];
	console.log(`[${tmpBook.IDBook}] "${tmpBook.Title}" by ${tmpBook.Author} ($${tmpBook.Price})`);
}
```

Output:

```
[1] "The Hobbit" by J.R.R. Tolkien ($12.99)
[2] "Dune" by Frank Herbert ($14.99)
[3] "Neuromancer" by William Gibson ($11.5)
```

The `all()` method returns an array of plain JavaScript objects. Column names become property keys.

---

## Step 5: Read a Single Row

```javascript
let tmpOneBook = tmpDB.prepare(`SELECT * FROM Book WHERE IDBook = ?`).get(2);
// tmpOneBook => { IDBook: 2, Title: 'Dune', Author: 'Frank Herbert', ... }
```

The `get()` method returns a single object, or `undefined` if no row matches.

---

## Step 6: Update

```javascript
let tmpUpdate = tmpDB.prepare(
	`UPDATE Book SET Price = ?, UpdateDate = datetime('now') WHERE IDBook = ?`
);
let tmpUpdateResult = tmpUpdate.run(16.99, 2);
// tmpUpdateResult.changes => 1

let tmpVerify = tmpDB.prepare(`SELECT * FROM Book WHERE IDBook = ?`).get(2);
// tmpVerify.Price => 16.99
```

---

## Step 7: Delete

```javascript
let tmpDelete = tmpDB.prepare(`DELETE FROM Book WHERE IDBook = ?`);
let tmpDeleteResult = tmpDelete.run(3);
// tmpDeleteResult.changes => 1

let tmpRemaining = tmpDB.prepare(`SELECT * FROM Book`).all();
// tmpRemaining.length => 2
```

---

## Step 8: Transactions

Transactions in better-sqlite3 wrap a function. If anything inside the function throws, the entire transaction is rolled back. Otherwise it commits atomically.

```javascript
let tmpBulkInsert = tmpDB.transaction(
	(pBooks) =>
	{
		let tmpStmt = tmpDB.prepare(
			`INSERT INTO Book (GUIDBook, Title, Author, YearPublished, Price) VALUES (?, ?, ?, ?, ?)`
		);
		for (let tmpBook of pBooks)
		{
			tmpStmt.run(tmpBook.GUID, tmpBook.Title, tmpBook.Author, tmpBook.Year, tmpBook.Price);
		}
	});

tmpBulkInsert(
	[
		{ GUID: _Fable.fable.getUUID(), Title: 'Snow Crash', Author: 'Neal Stephenson', Year: 1992, Price: 13.99 },
		{ GUID: _Fable.fable.getUUID(), Title: 'Hyperion', Author: 'Dan Simmons', Year: 1989, Price: 15.50 },
		{ GUID: _Fable.fable.getUUID(), Title: 'Foundation', Author: 'Isaac Asimov', Year: 1951, Price: 10.99 }
	]);
```

After the transaction, querying shows all five books:

```
[1] "The Hobbit" by J.R.R. Tolkien ($12.99)
[2] "Dune" by Frank Herbert ($16.99)
[4] "Snow Crash" by Neal Stephenson ($13.99)
[5] "Hyperion" by Dan Simmons ($15.5)
[6] "Foundation" by Isaac Asimov ($10.99)
```

Note that IDBook 3 is absent (deleted in Step 7) and the sequence skips to 4.

Transactions are significantly faster than individual inserts for bulk operations. Inserting 1,000 rows in a transaction can be 50-100x faster than 1,000 separate `run()` calls.

---

## Step 9: Aggregates

```javascript
let tmpStats = tmpDB.prepare(
	`SELECT COUNT(*) as BookCount, AVG(Price) as AvgPrice, SUM(Price) as TotalValue FROM Book`
).get();

console.log(`Books: ${tmpStats.BookCount}`);
// => Books: 5

console.log(`Average price: $${tmpStats.AvgPrice.toFixed(2)}`);
// => Average price: $14.09

console.log(`Total value: $${tmpStats.TotalValue.toFixed(2)}`);
// => Total value: $70.46
```

---

## Step 10: Close

```javascript
tmpDB.close();
```

After closing, further queries on this database instance will throw. The provider's `connected` property remains `true` — if you need to reconnect, create a new provider instance.

---

## Named Parameters

better-sqlite3 supports named parameters prefixed with `@`, `$`, or `:`:

```javascript
let tmpStmt = tmpDB.prepare(
	`SELECT * FROM Book WHERE Author = @author AND YearPublished > @minYear`
);

let tmpBooks = tmpStmt.all({ author: 'Isaac Asimov', minYear: 1950 });
```

Named parameters make complex queries more readable and less error-prone than positional `?` placeholders.

---

## In-Memory Databases

For test suites and ephemeral workflows, use `:memory:` instead of a file path:

```javascript
let _Fable = new libFable(
	{
		"Product": "TestSuite",
		"SQLite": { "SQLiteFilePath": ":memory:" }
	});

// Register, connect, create tables, run tests...
// Database is discarded when the process exits or the connection closes.
```

In-memory databases are faster than file-backed databases and leave no cleanup artifacts.

---

## Error Handling Pattern

```javascript
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection error: ${pError.message}`);
			return;
		}

		let tmpDB = _Fable.MeadowSQLiteProvider.db;

		try
		{
			tmpDB.exec(`CREATE TABLE Test (id INTEGER PRIMARY KEY)`);
			tmpDB.prepare(`INSERT INTO Test (id) VALUES (?)`).run(1);
		}
		catch (pQueryError)
		{
			_Fable.log.error(`Query error: ${pQueryError.message}`);
		}
	});
```

better-sqlite3 throws `SqliteError` exceptions for all query failures (syntax errors, constraint violations, missing tables). Wrap query blocks in try/catch for graceful handling.

---

## Pipeline Summary

| Step | Method | What It Does |
|------|--------|-------------|
| Connect | `connectAsync(cb)` | Opens the database file, enables WAL |
| Create | `db.exec(sql)` | Runs DDL statements |
| Insert | `db.prepare(sql).run(...)` | Returns `{ changes, lastInsertRowid }` |
| Read all | `db.prepare(sql).all(...)` | Returns array of row objects |
| Read one | `db.prepare(sql).get(...)` | Returns single object or `undefined` |
| Update | `db.prepare(sql).run(...)` | Returns `{ changes }` |
| Delete | `db.prepare(sql).run(...)` | Returns `{ changes }` |
| Transaction | `db.transaction(fn)(args)` | Atomic batch; auto-rollback on throw |
| Aggregate | `db.prepare(sql).get()` | Returns computed values |
| Close | `db.close()` | Releases file handle |
