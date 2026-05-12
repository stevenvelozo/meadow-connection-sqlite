/**
* Meadow SQLite Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

// Use Node's built-in synchronous SQLite binding (added in v22.5.0; stable
// in v24+ but available unflagged in current v22 LTS releases — it just
// emits a single ExperimentalWarning at first import on older v22 minors).
//
// Switched from `better-sqlite3` to eliminate the native-compile toolchain
// from every consumer's Dockerfile (python3 + make + g++ were required to
// build the better-sqlite3 native addon and broke recurrently on apt GPG
// signature failures and architecture mismatches across host/container
// boundaries).  `node:sqlite` ships with the runtime — zero install, no
// compile, no architecture portability concerns.
//
// API surface used here is a near-direct match: `new DatabaseSync(path,
// opts)`, `.exec(sql)`, `.prepare(sql).all/get/run(...)`.  The one
// difference is that `node:sqlite` does NOT expose a `.pragma()` helper —
// pragmas are issued via `.exec('PRAGMA ...')` (see connectAsync below).
const { DatabaseSync: libSQLite } = require('node:sqlite');

const libMeadowSchemaSQLite = require('./Meadow-Schema-SQLite.js');

/*
	Das alt muster:

	{
		"SQLiteFilePath": "./Meadow-SQLite-Database.sqlite"
	}
*/

class MeadowConnectionSQLite extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'MeadowConnectionSQLite';

		this.connected = false;
		this._database = false;

		// Schema provider handles DDL operations (create, drop, index, etc.)
		this._SchemaProvider = new libMeadowSchemaSQLite(this.fable, this.options, `${this.Hash}-Schema`);

		if (this.fable.settings.hasOwnProperty('SQLite'))
		{
			if (this.fable.settings.SQLite.hasOwnProperty('SQLiteFilePath'))
			{
				this.options.SQLiteFilePath = this.fable.settings.SQLite.SQLiteFilePath;
			}
		}
	}

	get schemaProvider()
	{
		return this._SchemaProvider;
	}

	generateDropTableStatement(pTableName)
	{
		return this._SchemaProvider.generateDropTableStatement(pTableName);
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateTableStatement(pMeadowTableSchema);
	}

	createTables(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createTables(pMeadowSchema, fCallback);
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createTable(pMeadowTableSchema, fCallback);
	}

	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		return this._SchemaProvider.getIndexDefinitionsFromSchema(pMeadowTableSchema);
	}

	generateCreateIndexScript(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexScript(pMeadowTableSchema);
	}

	generateCreateIndexStatements(pMeadowTableSchema)
	{
		return this._SchemaProvider.generateCreateIndexStatements(pMeadowTableSchema);
	}

	createIndex(pIndexStatement, fCallback)
	{
		return this._SchemaProvider.createIndex(pIndexStatement, fCallback);
	}

	createIndices(pMeadowTableSchema, fCallback)
	{
		return this._SchemaProvider.createIndices(pMeadowTableSchema, fCallback);
	}

	createAllIndices(pMeadowSchema, fCallback)
	{
		return this._SchemaProvider.createAllIndices(pMeadowSchema, fCallback);
	}

	// Database Introspection delegation

	listTables(fCallback)
	{
		return this._SchemaProvider.listTables(fCallback);
	}

	introspectTableColumns(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableColumns(pTableName, fCallback);
	}

	introspectTableIndices(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableIndices(pTableName, fCallback);
	}

	introspectTableForeignKeys(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableForeignKeys(pTableName, fCallback);
	}

	introspectTableSchema(pTableName, fCallback)
	{
		return this._SchemaProvider.introspectTableSchema(pTableName, fCallback);
	}

	introspectDatabaseSchema(fCallback)
	{
		return this._SchemaProvider.introspectDatabaseSchema(fCallback);
	}

	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		return this._SchemaProvider.generateMeadowPackageFromTable(pTableName, fCallback);
	}

	connect()
	{
		this.connectAsync();
	}

	connectAsync(fCallback)
	{
		let tmpCallback = fCallback;
		if (typeof (tmpCallback) !== 'function')
		{
			this.log.error(`Meadow SQLite connect() called without a callback; this could lead to connection race conditions.`);
			tmpCallback = () => { };
		}

		let tmpConnectionSettings = this.options;

		if (!tmpConnectionSettings.SQLiteFilePath)
		{
			let tmpCleansedLogSettings = JSON.parse(JSON.stringify(tmpConnectionSettings));
			// No leaking passwords!
			tmpCleansedLogSettings.password = '*****************';
			this.log.error(`Meadow-Connection-SQLite trying to connect to SQLite but the database file path is invalid; SQLiteFilePath must be in either the fable.settings.SQLite object or the connection provider constructor options.`, tmpCleansedLogSettings);
			return tmpCallback(new Error(`Meadow-Connection-SQLite trying to connect to SQLite but the database file path is invalid.`));
		}

		if (this.connected)
		{
			let tmpCleansedLogSettings = JSON.parse(JSON.stringify(tmpConnectionSettings));
			// No leaking passwords!
			tmpCleansedLogSettings.password = '*****************';
			this.log.error(`Meadow-Connection-SQLite trying to connect to SQLite but is already connected - skipping the second connect call.`, tmpCleansedLogSettings);
			return tmpCallback(null, this._database);
		}
		else
		{
			try
			{
				this.log.info(`Meadow-Connection-SQLite connecting to file [${tmpConnectionSettings.SQLiteFilePath}].`);
				this._database = new libSQLite(tmpConnectionSettings.SQLiteFilePath, tmpConnectionSettings);
				// Set WAL journal mode for performance.  node:sqlite has no
				// `.pragma()` helper (unlike better-sqlite3) — pragmas go
				// through the standard `.exec()` path.
				this._database.exec('PRAGMA journal_mode = WAL');
				this._SchemaProvider.setDatabase(this._database);
				this.log.info(`Meadow-Connection-SQLite successfully connected to SQLite file [${tmpConnectionSettings.SQLiteFilePath}].`);
				this.connected = true;
				return tmpCallback(null, this._database);
			}
			catch (pError)
			{
				this.log.error(`Meadow-Connection-SQLite error connecting to SQLite file [${tmpConnectionSettings.SQLiteFilePath}]: ${pError}`);
				return tmpCallback(pError);
			};
		}
	}

	get preparedStatement()
	{
		if (this.connected && this._database)
		{
			// Prepared statements are created via `db.prepare(sql)` on the
			// returned DatabaseSync handle.  Maintained for API consistency
			// with other Meadow connection providers.
			return this._database;
		}
		else
		{
			throw new Error('The Meadow SQLite provider is not connected; cannot create a prepared statement.');
		}
	}

	get SQLite()
	{
		return libSQLite;
	}

	get db()
	{
		return this._database;
	}
}

module.exports = MeadowConnectionSQLite;
