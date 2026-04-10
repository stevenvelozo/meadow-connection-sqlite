# db (getter)

Returns the underlying `better-sqlite3` Database instance for direct query access.

## Signature

```javascript
get db()
```

## Return Value

| Type | Description |
|------|-------------|
| `Database` | The better-sqlite3 Database instance (after `connectAsync()`) |
| `false` | Before connection |

## Primary Use

The `db` getter is the main entry point for all query operations. All queries go through better-sqlite3's synchronous API:

```javascript
let tmpDB = _Fable.MeadowSQLiteProvider.db;

// DDL -- run raw SQL (no return value)
tmpDB.exec(`
	CREATE TABLE IF NOT EXISTS Book (
		IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
		Title TEXT DEFAULT '',
		Author TEXT DEFAULT ''
	)
`);

// INSERT / UPDATE / DELETE -- returns { changes, lastInsertRowid }
let tmpResult = tmpDB.prepare('INSERT INTO Book (Title, Author) VALUES (?, ?)').run('Dune', 'Frank Herbert');
console.log(tmpResult.lastInsertRowid); // => 1
console.log(tmpResult.changes);         // => 1

// SELECT single row -- returns object or undefined
let tmpBook = tmpDB.prepare('SELECT * FROM Book WHERE IDBook = ?').get(1);
console.log(tmpBook.Title); // => 'Dune'

// SELECT all rows -- returns array of objects
let tmpBooks = tmpDB.prepare('SELECT * FROM Book').all();
console.log(tmpBooks.length); // => 1
```

## Prepared Statement Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `stmt.run(params...)` | `{ changes, lastInsertRowid }` | INSERT, UPDATE, DELETE |
| `stmt.get(params...)` | object or `undefined` | SELECT single row |
| `stmt.all(params...)` | array of objects | SELECT all matching rows |

## Named Parameters

better-sqlite3 supports named parameters prefixed with `@`, `$`, or `:`:

```javascript
let tmpStmt = tmpDB.prepare(
	'SELECT * FROM Book WHERE Author = @author AND YearPublished > @year'
);

let tmpBooks = tmpStmt.all({ author: 'Isaac Asimov', year: 1950 });
```

## Transactions

Wrap a function in a transaction for atomic operations:

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

tmpBulkInsert([
	{ Title: 'Foundation', Author: 'Isaac Asimov' },
	{ Title: 'Dune', Author: 'Frank Herbert' }
]);
```

If any statement inside the transaction throws, the entire transaction is rolled back automatically.

## Multi-Statement DDL

`exec()` runs one or more SQL statements without returning data:

```javascript
tmpDB.exec(`
	CREATE TABLE IF NOT EXISTS Book (
		IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
		Title TEXT DEFAULT ''
	);
	CREATE INDEX IF NOT EXISTS idx_book_title ON Book(Title);
`);
```

## PRAGMA Commands

```javascript
tmpDB.pragma('journal_mode');        // => [{ journal_mode: 'wal' }]
tmpDB.pragma('table_info(Book)');    // => column info array
```

## Before Connection

Returns `false` before `connectAsync()` is called:

```javascript
let tmpDB = _Fable.MeadowSQLiteProvider.db;
// tmpDB => false (not connected yet)
```

Always check `connected` before accessing `db`:

```javascript
if (!_Fable.MeadowSQLiteProvider.connected)
{
	console.error('Not connected to SQLite.');
	return;
}

let tmpDB = _Fable.MeadowSQLiteProvider.db;
```

## Closing the Database

```javascript
tmpDB.close();
```

After closing, further queries on this database instance will throw. The provider's `connected` property remains `true`.

## Related

- [connectAsync](connectAsync.md) -- Open the database connection
- [SQLite](SQLite.md) -- Access the better-sqlite3 module constructor
- [preparedStatement](preparedStatement.md) -- Alternative getter for the database handle
