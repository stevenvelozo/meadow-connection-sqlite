# generateDropTableStatement(pTableName)

Generates a `DROP TABLE IF EXISTS` SQL statement for the given table name.

## Signature

```javascript
generateDropTableStatement(pTableName)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pTableName` | `string` | The name of the table to drop |

## Return Value

| Type | Description |
|------|-------------|
| `string` | A `DROP TABLE IF EXISTS` SQL statement |

## Basic Usage

```javascript
let tmpDropSQL = _Fable.MeadowSQLiteProvider.generateDropTableStatement('Book');
console.log(tmpDropSQL);
```

Output:

```sql
DROP TABLE IF EXISTS Book;
```

## Executing the Drop

The method only generates the SQL — it does not execute it. Use `db.exec()` to run it:

```javascript
let tmpDropSQL = _Fable.MeadowSQLiteProvider.generateDropTableStatement('Book');
_Fable.MeadowSQLiteProvider.db.exec(tmpDropSQL);
```

## Idempotent

The generated statement uses `IF EXISTS`, so dropping a table that does not exist is a no-op:

```javascript
let tmpDropSQL = _Fable.MeadowSQLiteProvider.generateDropTableStatement('NonExistentTable');
_Fable.MeadowSQLiteProvider.db.exec(tmpDropSQL);
// No error — IF EXISTS handles it
```

## Comparison with MSSQL

| Feature | MSSQL | SQLite |
|---------|-------|--------|
| Syntax | `IF OBJECT_ID('dbo.Book', 'U') IS NOT NULL DROP TABLE [dbo].[Book]; GO` | `DROP TABLE IF EXISTS Book;` |
| Schema prefix | `[dbo].[TableName]` | None |
| Batch separator | `GO` | None needed |

## Comparison with MySQL

| Feature | MySQL | SQLite |
|---------|-------|--------|
| Syntax | `` DROP TABLE IF EXISTS `Book`; `` | `DROP TABLE IF EXISTS Book;` |
| Quoting | Backticks | None |

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate CREATE TABLE DDL
- [createTable](createTable.md) -- Generate and execute CREATE TABLE
- [db](db.md) -- Execute the drop statement via `db.exec()`
