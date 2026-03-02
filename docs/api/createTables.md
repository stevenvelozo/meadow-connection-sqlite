# createTables(pMeadowSchema, fCallback)

Creates all tables defined in a Meadow schema object. Tables are created sequentially.

## Signature

```javascript
createTables(pMeadowSchema, fCallback)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowSchema` | `object` | Meadow schema with a `Tables` array of table schemas |
| `fCallback` | `function` | Callback receiving `(error)` |

## Return Value

None. Results are delivered via the callback.

## Schema Object Format

```javascript
let tmpSchema =
{
	Tables:
	[
		{
			TableName: 'Book',
			Columns:
			[
				{ Column: 'IDBook', DataType: 'ID' },
				{ Column: 'GUIDBook', DataType: 'GUID' },
				{ Column: 'Title', DataType: 'String', Size: '256' }
			]
		},
		{
			TableName: 'Author',
			Columns:
			[
				{ Column: 'IDAuthor', DataType: 'ID' },
				{ Column: 'GUIDAuthor', DataType: 'GUID' },
				{ Column: 'Name', DataType: 'String', Size: '128' }
			]
		},
		{
			TableName: 'BookAuthor',
			Columns:
			[
				{ Column: 'IDBookAuthor', DataType: 'ID' },
				{ Column: 'IDBook', DataType: 'ForeignKey' },
				{ Column: 'IDAuthor', DataType: 'ForeignKey' }
			]
		}
	]
};
```

## Basic Usage

```javascript
_Fable.MeadowSQLiteProvider.createTables(tmpSchema,
	(pError) =>
	{
		if (pError)
		{
			_Fable.log.error(`Schema creation failed: ${pError}`);
			return;
		}

		_Fable.log.info('All tables created');
	});
```

## Behavior

- Iterates through `pMeadowSchema.Tables` using `fable.Utility.eachLimit` with concurrency 1
- Each table is created by calling `createTable()` internally
- If any table creation fails, the error is passed to the callback
- Uses `CREATE TABLE IF NOT EXISTS`, so existing tables are skipped without error

## Sequential Execution

Tables are created one at a time (concurrency = 1). This ensures that tables referenced by foreign keys can be created in the order you specify in the `Tables` array.

## Related

- [createTable](createTable.md) -- Create a single table
- [generateCreateTableStatement](generateCreateTableStatement.md) -- Generate DDL without executing
- [Schema & Table Creation](../schema.md) -- Full type mapping reference
