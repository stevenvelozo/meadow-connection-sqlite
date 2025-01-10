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
		let tmpDropTableStatement = `IF OBJECT_ID('dbo.[${pTableName}]', 'U') IS NOT NULL\n`;
		tmpDropTableStatement += `    DROP TABLE dbo.[${pTableName}];\n`;
		tmpDropTableStatement += `GO`;
		return tmpDropTableStatement;
	}

	generateCreateTableStatement(pMeadowTableSchema)
	{
		this.log.info(`--> Building the table create string for ${pMeadowTableSchema} ...`);

		let tmpPrimaryKey = false;
		let tmpCreateTableStatement = `--   [ ${pMeadowTableSchema.TableName} ]`;
		tmpCreateTableStatement += `\nCREATE TABLE [dbo].[${pMeadowTableSchema.TableName}]\n    (`;
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			// If we aren't the first column, append a comma.
			if (j > 0)
			{
				tmpCreateTableStatement += `,`;
			}

			tmpCreateTableStatement += `\n`;
			// Dump out each column......
			switch (tmpColumn.DataType)
			{
				case 'ID':
					// if (this.options.AllowIdentityInsert)
					// {
					// 	tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL PRIMARY KEY`;
					// }
					// else
					// {
					// There is debate on whether IDENTITY(1,1) is better or not.
					tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL IDENTITY PRIMARY KEY`;
					//}
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'GUID':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] VARCHAR(254) DEFAULT '00000000-0000-0000-0000-000000000000'`;
					break;
				case 'ForeignKey':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] INT UNSIGNED NOT NULL DEFAULT 0`;
					tmpPrimaryKey = tmpColumn.Column;
					break;
				case 'Numeric':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] INT NOT NULL DEFAULT 0`;
					break;
				case 'Decimal':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] DECIMAL(${tmpColumn.Size})`;
					break;
				case 'String':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] VARCHAR(${tmpColumn.Size}) DEFAULT ''`;
					break;
				case 'Text':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] TEXT`;
					break;
				case 'DateTime':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] DATETIME`;
					break;
				case 'Boolean':
					tmpCreateTableStatement += `        [${tmpColumn.Column}] TINYINT DEFAULT 0`;
					break;
				default:
					break;
			}
		}
		if (tmpPrimaryKey)
		{
			//				tmpCreateTableStatement += `,\n\n        PRIMARY KEY (${tmpPrimaryKey$})`;
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
		this._ConnectionPool.query(tmpCreateTableStatement)
			.then((pResult) =>
			{
				this.log.info(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} Success`);
				this.log.warn(`Meadow-SQLite Create Table Statement: ${tmpCreateTableStatement}`)
				return fCallback();
			})
			.catch((pError) =>
			{
				if (pError.hasOwnProperty('originalError')
					// TODO: This check may be extraneous; not familiar enough with the sqlite node driver yet
					&& (pError.originalError.hasOwnProperty('info'))
					// TODO: Validate that there isn't a better way to find this (pError.code isn't explicit enough)
					&& (pError.originalError.info.message.indexOf("There is already an object named") == 0)
					&& (pError.originalError.info.message.indexOf('in the database.') > 0))
				{
					// The table already existed; log a warning but keep on keeping on.
					//this.log.warn(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} executed but table already existed.`);
					//this.log.warn(`Meadow-SQLite Create Table Statement: ${tmpCreateTableStatement}`)
					return fCallback();
				}
				else
				{
					this.log.error(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
					//this.log.warn(`Meadow-SQLite Create Table Statement: ${tmpCreateTableStatement}`)
					return fCallback(pError);
				}
			});
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
		if (this.connected && this._ConnectionPool)
		{
			return new libSQLite.PreparedStatement(this._ConnectionPool);
		}
		else
		{
			throw new Error('The Meadow Microsoft SQL provider could not create a prepared statement; disconnected or no valid connection pool.');
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
