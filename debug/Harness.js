/*
	Exercise the create table functionality of the SQLite provider
*/
/**
* @author <steven@velozo.com>
*/

const libFable = require('fable');
let _Fable = new libFable(
	{
		"Product": "MeadowSQLiteTestBookstore",
		"ProductVersion": "1.0.0",

		"UUID":
			{
				"DataCenter": 0,
				"Worker": 0
			},
		"LogStreams":
			[
				{
					"streamtype": "console"
				}
			],

		"SQLite":
			{
				"server": "127.0.0.1",
				"port": 3306,
				"user": "sa",
				"password": "1234567890abc.",
				"database": "bookstore",
				"ConnectionPoolLimit": 20
			}
	});

_Fable.log.info("Application is starting up...");

const libMeadowConnectionSQLite = require('../source/Meadow-Connection-SQLite.js');
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider', 
	{
		// This makes the sync service still able to sync IDs.
		AllowIdentityInsert: true
	});

_Fable.log.info("...Creating SQL Connection pools at " + _Fable.settings.SQLite.server + "...");

_Fable.MeadowSQLiteProvider.connectAsync(
    (pError, pConnectionPool) =>
    {
        if (pError)
        {
            _Fable.log.error(`Error connecting to MS SQL Database: ${pError}`);
            return false;
        }

		const tmpTestModel = require('../retold-harness/model/json_schema/BookStore-Extended.json');

        _Fable.log.info('Connection complete!');
        _Fable.MeadowSQLiteProvider.createTables(tmpTestModel,
            (pCreateTablesError) =>
            {
                _Fable.log.info('Tables created successfully');
            });
	});


// const libFable = require('fable');
// const libMeadowConnectionSQLite = require('../source/Meadow-Connection-SQLite.js');

// let tmpTestModel = require('../retold-harness/model/json_schema/BookStore-Extended.json');

// let _Fable = new libFable(
// 	{
// 		"Product": "MeadowSQLiteTestBookstore",
// 		"ProductVersion": "1.0.0",

// 		"UUID":
// 			{
// 				"DataCenter": 0,
// 				"Worker": 0
// 			},
// 		"LogStreams":
// 			[
// 				{
// 					"streamtype": "console"
// 				}
// 			],

// 		"SQLite":
// 			{
// 				"server": "127.0.0.1",
// 				"port": 3306,
// 				"user": "sa",
// 				"password": "1234567890abc.",
// 				"database": "bookstore",
// 				"ConnectionPoolLimit": 20
// 			}
// 	});

// _Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);

// _Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

// _Fable.MeadowSQLiteProvider.connectAsync(
// 	(pError, pConnectionPool) =>
// 	{
// 		if (pError)
// 		{
// 			_Fable.log.error(`Error connecting to MS SQL Database: ${pError}`);
// 			return false;
// 		}

// 		_Fable.log.info('Connection complete!');
// 		_Fable.MeadowSQLiteProvider.createTables(tmpTestModel,
// 			(pCreateTablesError) =>
// 			{
// 				_Fable.log.info('Tables created successfully');
// 				let tmpPreparedStatement = _Fable.MeadowSQLiteProvider.preparedStatement;
// 				tmpPreparedStatement.input('param', _Fable.MeadowSQLiteProvider.SQLite.Int);
// 				tmpPreparedStatement.prepare('SELECT * FROM Book WHERE IDBook < @param',
// 					(pPrepareError) =>
// 					{
// 						tmpPreparedStatement.execute({ param: 12345 },
// 							(pPreparedExecutionError, pPreparedResult) =>
// 							{
// 								_Fable.log.info(`Prepared statement returned...`, pPreparedResult);
// 								// release the connection after queries are executed
// 								tmpPreparedStatement.unprepare(
// 									(pPreparedStatementUnprepareError) =>
// 									{
// 										_Fable.log.trace(`Prepared statement unprepared.`);
// 									});
// 							})
// 					});
// 			});
// 	}
// );
