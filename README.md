# Meadow Connection SQLite

A SQLite database connection provider for the Meadow ORM. Wraps [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) as a Fable service, providing file-based database connections with WAL journal mode and DDL generation from Meadow table schemas.

[![Build Status](https://github.com/stevenvelozo/meadow-connection-sqlite/workflows/Meadow-Connection-SQLite/badge.svg)](https://github.com/stevenvelozo/meadow-connection-sqlite/actions)
[![npm version](https://badge.fury.io/js/meadow-connection-sqlite.svg)](https://badge.fury.io/js/meadow-connection-sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Better-SQLite3 Wrapper** - Synchronous, high-performance SQLite access via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Fable Service Provider** - Registers with a Fable instance for dependency injection, logging, and configuration
- **WAL Journal Mode** - Automatically enables Write-Ahead Logging for performance on connect
- **Schema-Driven DDL** - Generates `CREATE TABLE` statements from Meadow table schemas with support for ID, GUID, ForeignKey, Numeric, Decimal, String, Text, DateTime, and Boolean column types
- **Connection Safety** - Guards against double-connect and missing file path errors with descriptive logging
- **Direct Database Access** - Exposes the underlying `better-sqlite3` database instance via `db` getter

## Installation

```bash
npm install meadow-connection-sqlite
```

## Quick Start

```javascript
const libFable = require('fable');
const MeadowConnectionSQLite = require('meadow-connection-sqlite');

let fable = new libFable(
{
	SQLite:
	{
		SQLiteFilePath: './my-database.sqlite'
	}
});

let connection = fable.instantiateServiceProvider('MeadowConnectionSQLite',
	{}, MeadowConnectionSQLite);

connection.connectAsync((pError, pDatabase) =>
{
	if (pError)
	{
		console.error('Connection failed:', pError);
		return;
	}

	// Use the better-sqlite3 database directly
	let stmt = connection.db.prepare('SELECT * FROM Users WHERE id = ?');
	let user = stmt.get(42);
});
```

## Configuration

The SQLite file path can be provided through Fable settings or the service provider options:

### Via Fable Settings

```javascript
let fable = new libFable(
{
	SQLite:
	{
		SQLiteFilePath: './data/app.sqlite'
	}
});
```

### Via Provider Options

```javascript
let connection = fable.instantiateServiceProvider('MeadowConnectionSQLite',
{
	SQLiteFilePath: './data/app.sqlite'
}, MeadowConnectionSQLite);
```

Any additional options are passed through to the `better-sqlite3` constructor.

## API

### `connectAsync(fCallback)`

Open the SQLite database file and enable WAL journal mode.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | `Function` | Callback receiving `(error, database)` |

### `connect()`

Synchronous convenience wrapper for `connectAsync` (no callback, logs a warning).

### `db` (getter)

Returns the underlying `better-sqlite3` database instance for direct query access.

### `SQLite` (getter)

Returns the `better-sqlite3` library module.

### `connected` (property)

Boolean indicating whether the database connection is open.

### `generateCreateTableStatement(pMeadowTableSchema)`

Generate a `CREATE TABLE` SQL statement from a Meadow table schema object.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pMeadowTableSchema` | `Object` | Meadow table schema with `TableName` and `Columns` array |

### `createTable(pMeadowTableSchema, fCallback)`

Execute a `CREATE TABLE` statement against the connected database.

### `createTables(pMeadowSchema, fCallback)`

Create all tables defined in a Meadow schema object (iterates `pMeadowSchema.Tables` sequentially).

### `generateDropTableStatement(pTableName)`

Generate a `DROP TABLE IF EXISTS` SQL statement for the given table name.

## Column Type Mapping

| Meadow Type | SQLite Column |
|-------------|---------------|
| `ID` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `GUID` | `TEXT DEFAULT '0000...'` |
| `ForeignKey` | `INTEGER NOT NULL DEFAULT 0` |
| `Numeric` | `INTEGER NOT NULL DEFAULT 0` |
| `Decimal` | `REAL` |
| `String` | `TEXT NOT NULL DEFAULT ''` |
| `Text` | `TEXT` |
| `DateTime` | `TEXT` |
| `Boolean` | `INTEGER NOT NULL DEFAULT 0` |

## Part of the Retold Framework

Meadow Connection SQLite is a database connector for the Meadow data access layer:

- [meadow](https://github.com/stevenvelozo/meadow) - ORM and data access framework
- [foxhound](https://github.com/stevenvelozo/foxhound) - Query DSL used by Meadow
- [stricture](https://github.com/stevenvelozo/stricture) - Schema definition tool
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) - RESTful endpoint generation
- [fable](https://github.com/stevenvelozo/fable) - Application services framework

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run coverage
```

## Related Packages

- [meadow](https://github.com/stevenvelozo/meadow) - Data access and ORM
- [fable](https://github.com/stevenvelozo/fable) - Application services framework

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).
