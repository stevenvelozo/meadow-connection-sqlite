/**
* Meadow SQLite Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libSQLite = require('better-sqlite3');

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
				// According to the documentation, setting this journal mode is very important for performance.
				// > Though not required, [it is generally important to set the WAL pragma for performance reasons](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md).
				this._database.pragma('journal_mode = WAL');
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
			// In better-sqlite3, prepared statements are created via db.prepare(sql)
			// This getter is maintained for API consistency with other providers.
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
