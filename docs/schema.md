# Schema & Table Creation

Meadow Connection SQLite generates `CREATE TABLE` statements from Meadow table schemas, translating Meadow data types to SQLite column definitions. This page documents the type mapping, DDL generation process, and examples.

---

## Column Type Mapping

| Meadow DataType | SQLite Column Definition | Notes |
|-----------------|--------------------------|-------|
| `ID` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Auto-incrementing primary key |
| `GUID` | `TEXT DEFAULT '00000000-0000-0000-0000-000000000000'` | Stored as 36-character UUID string |
| `ForeignKey` | `INTEGER NOT NULL DEFAULT 0` | Foreign key reference |
| `Numeric` | `INTEGER NOT NULL DEFAULT 0` | 64-bit signed integer |
| `Decimal` | `REAL` | 64-bit IEEE floating point |
| `String` | `TEXT NOT NULL DEFAULT ''` | Variable-length text (SQLite ignores length) |
| `Text` | `TEXT` | Unlimited text, nullable |
| `DateTime` | `TEXT` | ISO-8601 string (e.g. `datetime('now')`) |
| `Boolean` | `INTEGER NOT NULL DEFAULT 0` | 0 = false, 1 = true |

### SQLite Type Affinity

SQLite uses a flexible type system called "type affinity." Unlike MySQL or MSSQL, SQLite does not enforce declared column types. A `TEXT` column can store an integer, and an `INTEGER` column can store a string. The type mapping above follows SQLite conventions for predictable behavior:

- **INTEGER** -- Used for numeric values, booleans, and foreign keys
- **REAL** -- Used for decimal/floating-point values
- **TEXT** -- Used for strings, GUIDs, and dates (ISO-8601 format)

The `Size` field on Meadow `String` columns is accepted but has no effect in SQLite -- `TEXT` columns have unlimited length.

---

## Schema Object Format

A Meadow table schema is a plain JavaScript object:

```javascript
let tmpSchema =
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
```

Each entry in the `Columns` array requires:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `Column` | string | Yes | Column name |
| `DataType` | string | Yes | Meadow data type (see mapping above) |
| `Size` | string | No | Size specification (ignored by SQLite except for documentation) |

---

## Generating DDL

### generateCreateTableStatement()

Pass a schema object to `generateCreateTableStatement()` to get the SQL string:

```javascript
let tmpDDL = _Fable.MeadowSQLiteProvider.generateCreateTableStatement(tmpSchema);
console.log(tmpDDL);
```

Output:

```sql
CREATE TABLE IF NOT EXISTS Book (IDBook INTEGER PRIMARY KEY AUTOINCREMENT, GUIDBook TEXT DEFAULT '00000000-0000-0000-0000-000000000000', Title TEXT NOT NULL DEFAULT '', Author TEXT NOT NULL DEFAULT '', YearPublished INTEGER NOT NULL DEFAULT 0, Price REAL, InPrint INTEGER NOT NULL DEFAULT 0, CreateDate TEXT, UpdateDate TEXT);
```

Key behaviors:

- Always uses `CREATE TABLE IF NOT EXISTS` -- safe to run repeatedly
- Column names are used as-is (no quoting needed in SQLite)
- The `ID` column is always `INTEGER PRIMARY KEY AUTOINCREMENT`

### createTable()

Execute the DDL directly:

```javascript
_Fable.MeadowSQLiteProvider.createTable(tmpSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('Create table failed:', pError);
			return;
		}
		console.log('Table created successfully');
	});
```

The callback receives an error if the DDL fails, otherwise `undefined`.

### createTables()

Create multiple tables from a full Meadow schema:

```javascript
let tmpFullSchema =
{
	Tables:
	[
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'Title', DataType: 'String', Size: '256' }
			]
		},
		{
			TableName: 'Author',
			Columns:
			[
				{ Column: 'IDAuthor', DataType: 'ID' },
				{ Column: 'Name', DataType: 'String', Size: '128' }
			]
		}
	]
};

_Fable.MeadowSQLiteProvider.createTables(tmpFullSchema,
	(pError) =>
	{
		if (pError) { return; }
		console.log('All tables created');
	});
```

Tables are created sequentially using `fable.Utility.eachLimit` with concurrency 1.

---

## Generating DROP Statements

```javascript
let tmpDropDDL = _Fable.MeadowSQLiteProvider.generateDropTableStatement('Book');
console.log(tmpDropDDL);
```

Output:

```sql
DROP TABLE IF EXISTS Book;
```

---

## Comparison with Other Connectors

### MySQL vs SQLite DDL

| Feature | MySQL | SQLite |
|---------|-------|--------|
| `ID` type | `INT UNSIGNED NOT NULL AUTO_INCREMENT` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `GUID` type | `CHAR(36)` | `TEXT` |
| `String` type | `VARCHAR(n)` | `TEXT` |
| `Decimal` type | `DECIMAL(p,s)` | `REAL` |
| `Boolean` type | `TINYINT NOT NULL DEFAULT 0` | `INTEGER NOT NULL DEFAULT 0` |
| `DateTime` type | `DATETIME` | `TEXT` |
| Table name quoting | Backticks: `` `Book` `` | None: `Book` |
| Primary key | Separate `PRIMARY KEY (col)` | Inline `PRIMARY KEY AUTOINCREMENT` |
| Size enforcement | Yes | No |

### MSSQL vs SQLite DDL

| Feature | MSSQL | SQLite |
|---------|-------|--------|
| `ID` type | `INT IDENTITY(1,1)` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `GUID` type | `CHAR(36)` | `TEXT` |
| `String` type | `NVARCHAR(n)` | `TEXT` |
| Schema prefix | `[dbo].[Book]` | None |
| Column quoting | Square brackets: `[Title]` | None |
| Drop syntax | `IF OBJECT_ID('..') IS NOT NULL DROP TABLE` | `DROP TABLE IF EXISTS` |

---

## Related

- [API Reference](api/reference.md) -- Full API documentation
- [Full Pipeline Example](examples-pipeline.md) -- CRUD pipeline with table creation
- [generateCreateTableStatement](api/generateCreateTableStatement.md) -- Function reference
- [createTable](api/createTable.md) -- Function reference
- [createTables](api/createTables.md) -- Function reference
