# generateCreateTableStatement(pMeadowTableSchema)

Generates a `CREATE TABLE IF NOT EXISTS` SQL statement from a Meadow table schema object. Returns the SQL string without executing it.

## Signature

```javascript
generateCreateTableStatement(pMeadowTableSchema)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | `object` | Meadow table schema with `TableName` and `Columns` array |

## Return Value

| Type | Description |
|------|-------------|
| `string` | A `CREATE TABLE IF NOT EXISTS` SQL statement |

## Schema Object Format

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

Each column entry requires:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `Column` | string | Yes | Column name |
| `DataType` | string | Yes | Meadow data type |
| `Size` | string | No | Size specification (ignored by SQLite) |

## Basic Usage

```javascript
let tmpDDL = _Fable.MeadowSQLiteProvider.generateCreateTableStatement(tmpSchema);
console.log(tmpDDL);
```

Output:

```sql
CREATE TABLE IF NOT EXISTS Book (IDBook INTEGER PRIMARY KEY AUTOINCREMENT, GUIDBook TEXT DEFAULT '00000000-0000-0000-0000-000000000000', Title TEXT NOT NULL DEFAULT '', Author TEXT NOT NULL DEFAULT '', YearPublished INTEGER NOT NULL DEFAULT 0, Price REAL, InPrint INTEGER NOT NULL DEFAULT 0, CreateDate TEXT, UpdateDate TEXT);
```

## Type Mapping

| Meadow DataType | SQLite Column Definition |
|-----------------|--------------------------|
| `ID` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `GUID` | `TEXT DEFAULT '00000000-0000-0000-0000-000000000000'` |
| `ForeignKey` | `INTEGER NOT NULL DEFAULT 0` |
| `Numeric` | `INTEGER NOT NULL DEFAULT 0` |
| `Decimal` | `REAL` |
| `String` | `TEXT NOT NULL DEFAULT ''` |
| `Text` | `TEXT` |
| `DateTime` | `TEXT` |
| `Boolean` | `INTEGER NOT NULL DEFAULT 0` |

### Notes

- **Size is ignored** -- SQLite does not enforce `VARCHAR` length. The `Size` property is accepted for schema documentation but has no effect on the generated DDL.
- **`CREATE TABLE IF NOT EXISTS`** -- Always idempotent; safe to run repeatedly.
- **No column quoting** -- Column names are used as-is. SQLite does not require brackets or backticks.

## Comparison with MySQL

| Feature | MySQL | SQLite |
|---------|-------|--------|
| `ID` | `INT UNSIGNED NOT NULL AUTO_INCREMENT` + `PRIMARY KEY (col)` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `String(256)` | `VARCHAR(256)` | `TEXT` (size ignored) |
| `Decimal(10,2)` | `DECIMAL(10,2)` | `REAL` |
| `Boolean` | `TINYINT NOT NULL DEFAULT 0` | `INTEGER NOT NULL DEFAULT 0` |
| Table quoting | `` `TableName` `` | `TableName` (unquoted) |

## Comparison with MSSQL

| Feature | MSSQL | SQLite |
|---------|-------|--------|
| `ID` | `INT IDENTITY(1,1)` + `PRIMARY KEY CLUSTERED ([col])` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `String(256)` | `[col] NVARCHAR(256)` | `TEXT` |
| Schema prefix | `[dbo].[TableName]` | None |
| Column quoting | `[ColumnName]` | Unquoted |

## Related

- [createTable](createTable.md) -- Generate and execute the DDL
- [createTables](createTables.md) -- Create multiple tables at once
- [generateDropTableStatement](generateDropTableStatement.md) -- Generate a DROP TABLE statement
- [Schema & Table Creation](../schema.md) -- Full type mapping documentation
