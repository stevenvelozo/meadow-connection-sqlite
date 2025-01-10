/**
* @license     MIT
* @author      Steven Velozo <steven@velozo.com>
*/

const Chai = require('chai');
const Expect = Chai.expect;
const Assert = Chai.assert;

const libFable = require('fable');
const libMeadowConnectionSQLite = require('../source/Meadow-Connection-SQLite.js');

const _FableConfig = (
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
				"SQLiteFilePath": "./dist/FableTest.db"
			}
	});

suite
(
	'Connection',
	()=>
	{
		setup(()=>{});

		suite
		(
			'Connect to SQLite',
			()=>
			{
				test
				(
					'use default settings from fable.settings',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);

						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						Expect(_Fable.MeadowSQLiteProvider).to.be.an('object');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								if (pError)
								{
									return fDone(pError);
								}
								let tmpRows = _Fable.MeadowSQLiteProvider.db.prepare(`SELECT * FROM FableTest`).get();
								Expect(tmpRows).to.be.an('array');
							}
						);
					}
				);
			}
		);
	}
);