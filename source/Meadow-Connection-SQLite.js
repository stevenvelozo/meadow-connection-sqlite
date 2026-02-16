/**
* Meadow SQLite Provider Fable Service
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libSQLite = require('better-sqlite3');

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

		if (this.fable.settings.hasOwnProperty('SQLite'))
		{
			if (this.fable.settings.SQLite.hasOwnProperty('SQLiteFilePath'))
			{
				this.options.SQLiteFilePath = this.fable.settings.SQLite.SQLiteFilePath;
			}
		}
	}

	generateDropTableStatement(pTableName)
	{
		return `DROP TABLE IF EXISTS ${pTableName};`;
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		this.log.info(`--> Building the table create string for ${pMeadowTableSchema.TableName} ...`);

		let tmpPrimaryKey = false;
		let tmpCreateTableStatement = `--   [ ${pMeadowTableSchema.TableName} ]`;
		tmpCreateTableStatement += `\nCREATE TABLE IF NOT EXISTS ${pMeadowTableSchema.TableName}\n    (`;
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			// If we aren't the first column, append a comma.
			if (j > 0)
			{
				tmpCreateTableStatement += `,`;
			}

			tmpCreateTableStatement += `\n`;
			switch (tmpColumn.DataType)
			{
				case 'ID':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INTEGER PRIMARY KEY AUTOINCREMENT`;
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'GUID':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TEXT DEFAULT '00000000-0000-0000-0000-000000000000'`;
					break;
				case 'ForeignKey':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INTEGER NOT NULL DEFAULT 0`;
					break;
				case 'Numeric':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INTEGER NOT NULL DEFAULT 0`;
					break;
				case 'Decimal':
					tmpCreateTableStatement += `        ${tmpColumn.Column} REAL`;
					break;
				case 'String':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TEXT NOT NULL DEFAULT ''`;
					break;
				case 'Text':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TEXT`;
					break;
				case 'DateTime':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TEXT`;
					break;
				case 'Boolean':
					tmpCreateTableStatement += `        ${tmpColumn.Column} INTEGER NOT NULL DEFAULT 0`;
					break;
				default:
					break;
			}
		}
		tmpCreateTableStatement += `\n    );`;

		this.log.info(`Generated Create Table Statement: ${tmpCreateTableStatement}`);

		return tmpCreateTableStatement;
	}

	createTables(pMeadowSchema, fCallback)
	{
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createTable(pTable, fCreateComplete)
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-SQLite Error creating tables from Schema: ${pCreateError}`,pCreateError);
				}
				this.log.info('Done creating tables!');
				return fCallback(pCreateError);
			});
	}

	createTable(pMeadowTableSchema, fCallback)
	{
		let tmpCreateTableStatement = this.generateCreateTableStatement(pMeadowTableSchema);
		try
		{
			this._database.exec(tmpCreateTableStatement);
			this.log.info(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} Success`);
			return fCallback();
		}
		catch (pError)
		{
			this.log.error(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
			return fCallback(pError);
		}
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
