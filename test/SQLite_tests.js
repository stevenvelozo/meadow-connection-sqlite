/**
* @license     MIT
* @author      Steven Velozo <steven@velozo.com>
*/

const Chai = require('chai');
const Expect = Chai.expect;
const Assert = Chai.assert;
const libFS = require('fs');

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

// A sample Stricture-compiled Meadow table schema
const _BookTableSchema =
{
	TableName: 'Book',
	Domain: 'Default',
	Columns:
	[
		{ Column: 'IDBook', DataType: 'ID' },
		{ Column: 'GUIDBook', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Size: '256' },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'Price', DataType: 'Decimal', Size: '10,2' },
		{ Column: 'PageCount', DataType: 'Numeric' },
		{ Column: 'PublishDate', DataType: 'DateTime' },
		{ Column: 'InPrint', DataType: 'Boolean' },
		{ Column: 'IDAuthor', DataType: 'ForeignKey' }
	],
	Description: 'A table of books'
};

const _AuthorTableSchema =
{
	TableName: 'Author',
	Domain: 'Default',
	Columns:
	[
		{ Column: 'IDAuthor', DataType: 'ID' },
		{ Column: 'GUIDAuthor', DataType: 'GUID' },
		{ Column: 'Name', DataType: 'String', Size: '128' },
		{ Column: 'Bio', DataType: 'Text' }
	],
	Description: 'A table of authors'
};

suite
(
	'Connection',
	()=>
	{
		setup(
			(fDone) =>
			{
				if (libFS.existsSync('./dist/FableTest.db'))
				{
					libFS.unlinkSync('./dist/FableTest.db');
				}
				if (!libFS.existsSync('./dist'))
				{
					libFS.mkdirSync('./dist', { recursive: true });
				}
				return fDone();
			});

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
								Expect(pError).to.not.exist;
								Expect(_Fable.MeadowSQLiteProvider.connected).to.equal(true);
								Expect(_Fable.MeadowSQLiteProvider.db).to.be.an('object');
								return fDone();
							}
						);
					}
				);

				test
				(
					'attempt to connect twice should not error',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.not.exist;
								// Connect again -- should log an error but callback with the existing database
								_Fable.MeadowSQLiteProvider.connectAsync(
									(pSecondError, pDatabase) =>
									{
										// Should not be a hard error
										Expect(pSecondError).to.not.exist;
										Expect(pDatabase).to.be.an('object');
										return fDone();
									});
							});
					}
				);

				test
				(
					'connect without a callback should not throw',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						// Call connect() (sync wrapper) which calls connectAsync without a callback
						_Fable.MeadowSQLiteProvider.connect();
						// Give it a tick to complete
						setTimeout(
							() =>
							{
								Expect(_Fable.MeadowSQLiteProvider.connected).to.equal(true);
								return fDone();
							}, 100);
					}
				);

				test
				(
					'fail to connect with no SQLiteFilePath',
					(fDone) =>
					{
						let _Fable = new libFable(
							{
								Product: 'MeadowSQLiteTestNoPath',
								ProductVersion: '1.0.0'
							});
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.be.an.instanceof(Error);
								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'DDL Generation',
			()=>
			{
				test
				(
					'generate a DROP TABLE statement',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						let tmpDropStatement = _Fable.MeadowSQLiteProvider.generateDropTableStatement('Book');
						Expect(tmpDropStatement).to.equal('DROP TABLE IF EXISTS Book;');
						return fDone();
					}
				);

				test
				(
					'generate a CREATE TABLE statement from a Meadow table schema',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.not.exist;
								let tmpCreateStatement = _Fable.MeadowSQLiteProvider.generateCreateTableStatement(_BookTableSchema);

								// Should use SQLite syntax, not MSSQL
								Expect(tmpCreateStatement).to.contain('CREATE TABLE IF NOT EXISTS Book');
								Expect(tmpCreateStatement).to.contain('IDBook INTEGER PRIMARY KEY AUTOINCREMENT');
								Expect(tmpCreateStatement).to.contain('GUIDBook TEXT DEFAULT');
								Expect(tmpCreateStatement).to.contain('Title TEXT NOT NULL DEFAULT');
								Expect(tmpCreateStatement).to.contain('Description TEXT');
								Expect(tmpCreateStatement).to.contain('Price REAL');
								Expect(tmpCreateStatement).to.contain('PageCount INTEGER NOT NULL DEFAULT 0');
								Expect(tmpCreateStatement).to.contain('PublishDate TEXT');
								Expect(tmpCreateStatement).to.contain('InPrint INTEGER NOT NULL DEFAULT 0');
								Expect(tmpCreateStatement).to.contain('IDAuthor INTEGER NOT NULL DEFAULT 0');

								// Should NOT contain any MSSQL syntax
								Expect(tmpCreateStatement).to.not.contain('[dbo]');
								Expect(tmpCreateStatement).to.not.contain('IDENTITY');
								Expect(tmpCreateStatement).to.not.contain('UNSIGNED');
								Expect(tmpCreateStatement).to.not.contain('TINYINT');
								Expect(tmpCreateStatement).to.not.contain('VARCHAR');

								return fDone();
							});
					}
				);
			}
		);

		suite
		(
			'Create Tables',
			()=>
			{
				test
				(
					'create a single table',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.not.exist;

								_Fable.MeadowSQLiteProvider.createTable(_BookTableSchema,
									(pCreateError) =>
									{
										Expect(pCreateError).to.not.exist;

										// Verify the table was actually created by inserting and reading back
										let tmpDB = _Fable.MeadowSQLiteProvider.db;
										tmpDB.prepare('INSERT INTO Book (Title, Price, PageCount, InPrint) VALUES (?, ?, ?, ?)').run('Test Book', 19.99, 200, 1);

										let tmpRow = tmpDB.prepare('SELECT * FROM Book WHERE IDBook = 1').get();
										Expect(tmpRow).to.be.an('object');
										Expect(tmpRow.Title).to.equal('Test Book');
										Expect(tmpRow.Price).to.equal(19.99);
										Expect(tmpRow.PageCount).to.equal(200);
										Expect(tmpRow.InPrint).to.equal(1);
										Expect(tmpRow.IDAuthor).to.equal(0);
										Expect(tmpRow.GUIDBook).to.equal('00000000-0000-0000-0000-000000000000');
										return fDone();
									});
							});
					}
				);

				test
				(
					'create a table that already exists (idempotent)',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.not.exist;

								// Create the table
								_Fable.MeadowSQLiteProvider.createTable(_BookTableSchema,
									(pCreateError) =>
									{
										Expect(pCreateError).to.not.exist;

										// Create it again -- should not error because of IF NOT EXISTS
										_Fable.MeadowSQLiteProvider.createTable(_BookTableSchema,
											(pSecondCreateError) =>
											{
												Expect(pSecondCreateError).to.not.exist;
												return fDone();
											});
									});
							});
					}
				);

				test
				(
					'create multiple tables from a schema',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.not.exist;

								let tmpSchema =
								{
									Tables:
									[
										_BookTableSchema,
										_AuthorTableSchema
									]
								};

								_Fable.MeadowSQLiteProvider.createTables(tmpSchema,
									(pCreateError) =>
									{
										Expect(pCreateError).to.not.exist;

										// Verify both tables exist
										let tmpDB = _Fable.MeadowSQLiteProvider.db;

										tmpDB.prepare('INSERT INTO Author (Name) VALUES (?)').run('Test Author');
										let tmpAuthor = tmpDB.prepare('SELECT * FROM Author WHERE IDAuthor = 1').get();
										Expect(tmpAuthor).to.be.an('object');
										Expect(tmpAuthor.Name).to.equal('Test Author');

										tmpDB.prepare('INSERT INTO Book (Title, IDAuthor) VALUES (?, ?)').run('Author Book', 1);
										let tmpBook = tmpDB.prepare('SELECT * FROM Book WHERE IDBook = 1').get();
										Expect(tmpBook).to.be.an('object');
										Expect(tmpBook.Title).to.equal('Author Book');
										Expect(tmpBook.IDAuthor).to.equal(1);

										return fDone();
									});
							});
					}
				);
			}
		);

		suite
		(
			'Accessors',
			()=>
			{
				test
				(
					'access the SQLite library via the SQLite getter',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						Expect(_Fable.MeadowSQLiteProvider.SQLite).to.be.a('function');
						return fDone();
					}
				);

				test
				(
					'access the preparedStatement getter when connected',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								Expect(pError).to.not.exist;
								let tmpPrepared = _Fable.MeadowSQLiteProvider.preparedStatement;
								Expect(tmpPrepared).to.be.an('object');
								return fDone();
							});
					}
				);

				test
				(
					'preparedStatement getter throws when disconnected',
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

						Expect(() => _Fable.MeadowSQLiteProvider.preparedStatement).to.throw('The Meadow SQLite provider is not connected');
						return fDone();
					}
				);
			}
		);
	}
);
