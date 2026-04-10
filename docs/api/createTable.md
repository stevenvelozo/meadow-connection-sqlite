# createTable(pMeadowTableSchema, fCallback)

Generates a `CREATE TABLE IF NOT EXISTS` statement from a Meadow table schema and executes it against the connected database.

## Signature

```javascript
createTable(pMeadowTableSchema, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | `object` | Meadow table schema with `TableName` and `Columns` array |
| `fCallback` | `function` | Callback receiving `(error)` |

## Return Value

None. Results are delivered via the callback.

## Behavior

1. Calls `generateCreateTableStatement(pMeadowTableSchema)` to build the DDL
2. Executes the DDL using `db.exec()`
3. Calls back with `undefined` on success, or an error if the DDL fails

Because the generated DDL uses `CREATE TABLE IF NOT EXISTS`, calling `createTable()` for an already-existing table is a no-op -- it does not error.

## Basic Usage

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
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' }
	]
};

_Fable.MeadowSQLiteProvider.createTable(tmpBookSchema,
	(pError) =>
	{
		if (pError)
		{
			_Fable.log.error(`Create table failed: ${pError}`);
			return;
		}
		_Fable.log.info('Book table created');
	});
```

## Idempotent

Safe to call multiple times. The second call is a no-op:

```javascript
_Fable.MeadowSQLiteProvider.createTable(tmpBookSchema,
	(pError) =>
	{
		// Table created

		_Fable.MeadowSQLiteProvider.createTable(tmpBookSchema,
			(pError) =>
			{
				// No error -- "IF NOT EXISTS" handles it
			});
	});
```

## Error Handling

Errors from `db.exec()` (e.g. invalid column definitions) are passed to the callback:

```javascript
_Fable.MeadowSQLiteProvider.createTable(tmpBadSchema,
	(pError) =>
	{
		if (pError)
		{
			console.error('DDL execution failed:', pError.message);
		}
	});
```

## Related

- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [createTables](createTables.md) -- Create multiple tables at once
- [generateDropTableStatement](generateDropTableStatement.md) -- Drop a table
- [Schema & Table Creation](../schema.md) -- Full type mapping reference
