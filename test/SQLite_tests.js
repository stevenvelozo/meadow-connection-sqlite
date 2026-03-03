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
const libMeadowSchemaSQLite = require('../source/Meadow-Schema-SQLite.js');

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

const _BookTableSchemaWithColumnIndexed =
{
	TableName: 'BookIndexed',
	Columns:
	[
		{ Column: 'IDBookIndexed', DataType: 'ID' },
		{ Column: 'GUIDBookIndexed', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Indexed: true },
		{ Column: 'Description', DataType: 'Text' },
		{ Column: 'ISBN', DataType: 'String', Indexed: 'unique' },
		{ Column: 'IDPublisher', DataType: 'ForeignKey' }
	]
};

const _BookTableSchemaWithIndexName =
{
	TableName: 'BookCustomIdx',
	Columns:
	[
		{ Column: 'IDBookCustomIdx', DataType: 'ID' },
		{ Column: 'GUIDBookCustomIdx', DataType: 'GUID' },
		{ Column: 'Title', DataType: 'String', Indexed: true, IndexName: 'IX_Custom_Title' },
		{ Column: 'ISBN', DataType: 'String', Indexed: 'unique', IndexName: 'UQ_BookCustomIdx_ISBN' },
		{ Column: 'YearPublished', DataType: 'Numeric', Indexed: true },
		{ Column: 'IDEditor', DataType: 'ForeignKey' }
	]
};

const _ChinookSQL = `
CREATE TABLE Artist (
    ArtistId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    Name NVARCHAR(120)
);

CREATE TABLE Album (
    AlbumId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    Title NVARCHAR(160) NOT NULL,
    ArtistId INTEGER NOT NULL,
    FOREIGN KEY (ArtistId) REFERENCES Artist (ArtistId)
);

CREATE TABLE Employee (
    EmployeeId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    LastName NVARCHAR(20) NOT NULL,
    FirstName NVARCHAR(20) NOT NULL,
    Title NVARCHAR(30),
    ReportsTo INTEGER,
    BirthDate DATETIME,
    HireDate DATETIME,
    Address NVARCHAR(70),
    City NVARCHAR(40),
    State NVARCHAR(40),
    Country NVARCHAR(40),
    PostalCode NVARCHAR(10),
    Phone NVARCHAR(24),
    Fax NVARCHAR(24),
    Email NVARCHAR(60),
    FOREIGN KEY (ReportsTo) REFERENCES Employee (EmployeeId)
);

CREATE TABLE Customer (
    CustomerId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    FirstName NVARCHAR(40) NOT NULL,
    LastName NVARCHAR(20) NOT NULL,
    Company NVARCHAR(80),
    Address NVARCHAR(70),
    City NVARCHAR(40),
    State NVARCHAR(40),
    Country NVARCHAR(40),
    PostalCode NVARCHAR(10),
    Phone NVARCHAR(24),
    Fax NVARCHAR(24),
    Email NVARCHAR(60) NOT NULL,
    SupportRepId INTEGER,
    FOREIGN KEY (SupportRepId) REFERENCES Employee (EmployeeId)
);

CREATE TABLE Genre (
    GenreId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    Name NVARCHAR(120)
);

CREATE TABLE MediaType (
    MediaTypeId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    Name NVARCHAR(120)
);

CREATE TABLE Playlist (
    PlaylistId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    Name NVARCHAR(120)
);

CREATE TABLE Track (
    TrackId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    AlbumId INTEGER,
    MediaTypeId INTEGER NOT NULL,
    GenreId INTEGER,
    Composer NVARCHAR(220),
    Milliseconds INTEGER NOT NULL,
    Bytes INTEGER,
    UnitPrice NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (AlbumId) REFERENCES Album (AlbumId),
    FOREIGN KEY (MediaTypeId) REFERENCES MediaType (MediaTypeId),
    FOREIGN KEY (GenreId) REFERENCES Genre (GenreId)
);

CREATE TABLE Invoice (
    InvoiceId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    CustomerId INTEGER NOT NULL,
    InvoiceDate DATETIME NOT NULL,
    BillingAddress NVARCHAR(70),
    BillingCity NVARCHAR(40),
    BillingState NVARCHAR(40),
    BillingCountry NVARCHAR(40),
    BillingPostalCode NVARCHAR(10),
    Total NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (CustomerId) REFERENCES Customer (CustomerId)
);

CREATE TABLE InvoiceLine (
    InvoiceLineId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    InvoiceId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    UnitPrice NUMERIC(10,2) NOT NULL,
    Quantity INTEGER NOT NULL,
    FOREIGN KEY (InvoiceId) REFERENCES Invoice (InvoiceId),
    FOREIGN KEY (TrackId) REFERENCES Track (TrackId)
);

CREATE TABLE PlaylistTrack (
    PlaylistId INTEGER NOT NULL,
    TrackId INTEGER NOT NULL,
    PRIMARY KEY (PlaylistId, TrackId),
    FOREIGN KEY (PlaylistId) REFERENCES Playlist (PlaylistId),
    FOREIGN KEY (TrackId) REFERENCES Track (TrackId)
);
`;

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

		suite
		(
			'Index Generation',
			()=>
			{
				let libSchemaSQLite = null;

				setup(
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						libSchemaSQLite = _Fable.serviceManager.addServiceType('MeadowSchemaSQLite', libMeadowSchemaSQLite);
						libSchemaSQLite = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaSQLite');
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');
						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								libSchemaSQLite.setDatabase(_Fable.MeadowSQLiteProvider.db);
								return fDone();
							});
					});

				test
				(
					'auto-detect GUID and ForeignKey indices',
					() =>
					{
						let tmpIndices = libSchemaSQLite.getIndexDefinitionsFromSchema(_BookTableSchema);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(2);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDBook');
						Expect(tmpIndices[0].Unique).to.equal(true);
						Expect(tmpIndices[1].Name).to.equal('IX_M_IDAuthor');
						Expect(tmpIndices[1].Unique).to.equal(false);
					}
				);

				test
				(
					'generate idempotent index script with IF NOT EXISTS',
					() =>
					{
						let tmpScript = libSchemaSQLite.generateCreateIndexScript(_BookTableSchema);
						Expect(tmpScript).to.contain('CREATE UNIQUE INDEX IF NOT EXISTS AK_M_GUIDBook ON Book(GUIDBook)');
						Expect(tmpScript).to.contain('CREATE INDEX IF NOT EXISTS IX_M_IDAuthor ON Book(IDAuthor)');
					}
				);

				test
				(
					'generate individual index statements with sqlite_master check',
					() =>
					{
						let tmpStatements = libSchemaSQLite.generateCreateIndexStatements(_BookTableSchema);
						Expect(tmpStatements).to.be.an('array');
						Expect(tmpStatements.length).to.equal(2);
						Expect(tmpStatements[0].Name).to.equal('AK_M_GUIDBook');
						Expect(tmpStatements[0].Statement).to.contain('CREATE UNIQUE INDEX AK_M_GUIDBook');
						Expect(tmpStatements[0].CheckStatement).to.contain("sqlite_master");
						Expect(tmpStatements[1].Name).to.equal('IX_M_IDAuthor');
					}
				);

				test
				(
					'create indices on a live SQLite database',
					(fDone) =>
					{
						let tmpCreateTableStatement = libSchemaSQLite.generateCreateTableStatement(_BookTableSchema);
						libSchemaSQLite._Database.exec(tmpCreateTableStatement);
						libSchemaSQLite.createIndices(_BookTableSchema,
							(pError) =>
							{
								Expect(pError).to.not.exist;
								let tmpResult = libSchemaSQLite._Database.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Book' ORDER BY name").all();
								let tmpNames = tmpResult.map(r => r.name);
								Expect(tmpNames).to.include('AK_M_GUIDBook');
								Expect(tmpNames).to.include('IX_M_IDAuthor');
								return fDone();
							});
					}
				);

				test
				(
					'create indices idempotently (run twice)',
					(fDone) =>
					{
						let tmpCreateTableStatement = libSchemaSQLite.generateCreateTableStatement(_BookTableSchema);
						libSchemaSQLite._Database.exec(tmpCreateTableStatement);
						libSchemaSQLite.createIndices(_BookTableSchema,
							(pError) =>
							{
								Expect(pError).to.not.exist;
								libSchemaSQLite.createIndices(_BookTableSchema,
									(pError2) =>
									{
										Expect(pError2).to.not.exist;
										return fDone();
									});
							});
					}
				);

				test
				(
					'createAllIndices creates indices for all tables in schema',
					(fDone) =>
					{
						let tmpCreateBook = libSchemaSQLite.generateCreateTableStatement(_BookTableSchema);
						let tmpCreateAuthor = libSchemaSQLite.generateCreateTableStatement(_AuthorTableSchema);
						libSchemaSQLite._Database.exec(tmpCreateBook);
						libSchemaSQLite._Database.exec(tmpCreateAuthor);
						let tmpSchema = { Tables: [_BookTableSchema, _AuthorTableSchema] };
						libSchemaSQLite.createAllIndices(tmpSchema,
							(pError) =>
							{
								Expect(pError).to.not.exist;
								return fDone();
							});
					}
				);

				test
				(
					'column-level Indexed property generates consistently named indices',
					() =>
					{
						let tmpIndices = libSchemaSQLite.getIndexDefinitionsFromSchema(_BookTableSchemaWithColumnIndexed);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(4);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDBookIndexed');
						Expect(tmpIndices[1].Name).to.equal('IX_M_T_BookIndexed_C_Title');
						Expect(tmpIndices[1].Unique).to.equal(false);
						Expect(tmpIndices[2].Name).to.equal('AK_M_T_BookIndexed_C_ISBN');
						Expect(tmpIndices[2].Unique).to.equal(true);
						Expect(tmpIndices[3].Name).to.equal('IX_M_IDPublisher');
					}
				);

				test
				(
					'create column-level Indexed indices on a live SQLite database',
					(fDone) =>
					{
						let tmpCreateTableStatement = libSchemaSQLite.generateCreateTableStatement(_BookTableSchemaWithColumnIndexed);
						libSchemaSQLite._Database.exec(tmpCreateTableStatement);
						libSchemaSQLite.createIndices(_BookTableSchemaWithColumnIndexed,
							(pError) =>
							{
								Expect(pError).to.not.exist;
								let tmpResult = libSchemaSQLite._Database.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='BookIndexed' ORDER BY name").all();
								let tmpNames = tmpResult.map(r => r.name);
								Expect(tmpNames).to.include('AK_M_GUIDBookIndexed');
								Expect(tmpNames).to.include('IX_M_T_BookIndexed_C_Title');
								Expect(tmpNames).to.include('AK_M_T_BookIndexed_C_ISBN');
								Expect(tmpNames).to.include('IX_M_IDPublisher');
								return fDone();
							});
					}
				);

				test
				(
					'IndexName property overrides auto-generated index name',
					() =>
					{
						let tmpIndices = libSchemaSQLite.getIndexDefinitionsFromSchema(_BookTableSchemaWithIndexName);
						Expect(tmpIndices).to.be.an('array');
						Expect(tmpIndices.length).to.equal(5);
						Expect(tmpIndices[0].Name).to.equal('AK_M_GUIDBookCustomIdx');
						Expect(tmpIndices[0].Unique).to.equal(true);
						Expect(tmpIndices[1].Name).to.equal('IX_Custom_Title');
						Expect(tmpIndices[1].Unique).to.equal(false);
						Expect(tmpIndices[2].Name).to.equal('UQ_BookCustomIdx_ISBN');
						Expect(tmpIndices[2].Unique).to.equal(true);
						Expect(tmpIndices[3].Name).to.equal('IX_M_T_BookCustomIdx_C_YearPublished');
						Expect(tmpIndices[3].Unique).to.equal(false);
						Expect(tmpIndices[4].Name).to.equal('IX_M_IDEditor');
					}
				);

				test
				(
					'create IndexName-overridden indices on a live SQLite database',
					(fDone) =>
					{
						let tmpCreateTableStatement = libSchemaSQLite.generateCreateTableStatement(_BookTableSchemaWithIndexName);
						libSchemaSQLite._Database.exec(tmpCreateTableStatement);
						libSchemaSQLite.createIndices(_BookTableSchemaWithIndexName,
							(pError) =>
							{
								Expect(pError).to.not.exist;
								let tmpResult = libSchemaSQLite._Database.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='BookCustomIdx' ORDER BY name").all();
								let tmpNames = tmpResult.map(r => r.name);
								Expect(tmpNames).to.include('IX_Custom_Title');
								Expect(tmpNames).to.include('UQ_BookCustomIdx_ISBN');
								Expect(tmpNames).to.include('IX_M_T_BookCustomIdx_C_YearPublished');
								Expect(tmpNames).to.include('AK_M_GUIDBookCustomIdx');
								Expect(tmpNames).to.include('IX_M_IDEditor');
								return fDone();
							});
					}
				);
			}
		);

		test
		(
			'schema provider is accessible from connection provider',
			(fDone) =>
			{
				let _Fable = new libFable(_FableConfig);
				_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
				_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');
				Expect(_Fable.MeadowSQLiteProvider.schemaProvider).to.be.an('object');
				return fDone();
			}
		);

		suite
		(
			'Database Introspection',
			()=>
			{
				let libSchemaSQLite = null;

				setup(
					(fDone) =>
					{
						let _Fable = new libFable(_FableConfig);
						libSchemaSQLite = _Fable.serviceManager.addServiceType('MeadowSchemaSQLite', libMeadowSchemaSQLite);
						libSchemaSQLite = _Fable.serviceManager.instantiateServiceProvider('MeadowSchemaSQLite');
						_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
						_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');
						_Fable.MeadowSQLiteProvider.connectAsync(
							(pError) =>
							{
								libSchemaSQLite.setDatabase(_Fable.MeadowSQLiteProvider.db);
								// Create tables and indices for introspection tests
								let tmpCreateBook = libSchemaSQLite.generateCreateTableStatement(_BookTableSchema);
								libSchemaSQLite._Database.exec(tmpCreateBook);
								libSchemaSQLite.createIndices(_BookTableSchema,
									(pIndexError) =>
									{
										let tmpCreateIndexed = libSchemaSQLite.generateCreateTableStatement(_BookTableSchemaWithColumnIndexed);
										libSchemaSQLite._Database.exec(tmpCreateIndexed);
										libSchemaSQLite.createIndices(_BookTableSchemaWithColumnIndexed,
											(pIndexError2) =>
											{
												let tmpCreateCustom = libSchemaSQLite.generateCreateTableStatement(_BookTableSchemaWithIndexName);
												libSchemaSQLite._Database.exec(tmpCreateCustom);
												libSchemaSQLite.createIndices(_BookTableSchemaWithIndexName,
													(pIndexError3) =>
													{
														return fDone();
													});
											});
									});
							});
					});

				test
				(
					'listTables returns all user tables',
					(fDone) =>
					{
						libSchemaSQLite.listTables(
							(pError, pTables) =>
							{
								Expect(pError).to.not.exist;
								Expect(pTables).to.be.an('array');
								Expect(pTables.length).to.be.greaterThan(0);
								Expect(pTables).to.include('Book');
								Expect(pTables).to.include('BookIndexed');
								Expect(pTables).to.include('BookCustomIdx');
								return fDone();
							});
					}
				);

				test
				(
					'introspectTableColumns returns column definitions for Book',
					(fDone) =>
					{
						libSchemaSQLite.introspectTableColumns('Book',
							(pError, pColumns) =>
							{
								Expect(pError).to.not.exist;
								Expect(pColumns).to.be.an('array');
								Expect(pColumns.length).to.equal(9);

								// ID column
								Expect(pColumns[0].Column).to.equal('IDBook');
								Expect(pColumns[0].DataType).to.equal('ID');

								// GUID column
								Expect(pColumns[1].Column).to.equal('GUIDBook');
								Expect(pColumns[1].DataType).to.equal('GUID');

								// String column
								Expect(pColumns[2].Column).to.equal('Title');
								// Title is TEXT NOT NULL DEFAULT '' → maps to String
								Expect(pColumns[2].DataType).to.equal('String');

								// Text column
								Expect(pColumns[3].Column).to.equal('Description');
								Expect(pColumns[3].DataType).to.equal('Text');

								// Decimal column
								Expect(pColumns[4].Column).to.equal('Price');
								Expect(pColumns[4].DataType).to.equal('Decimal');

								// Numeric column
								Expect(pColumns[5].Column).to.equal('PageCount');
								Expect(pColumns[5].DataType).to.equal('Numeric');

								// DateTime column (stored as TEXT in SQLite)
								Expect(pColumns[6].Column).to.equal('PublishDate');
								Expect(pColumns[6].DataType).to.equal('Text');

								// Boolean column (stored as INTEGER, detected by "In" prefix + NOT NULL DEFAULT 0)
								Expect(pColumns[7].Column).to.equal('InPrint');
								Expect(pColumns[7].DataType).to.equal('Boolean');

								// ForeignKey column
								Expect(pColumns[8].Column).to.equal('IDAuthor');
								Expect(pColumns[8].DataType).to.equal('Numeric');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableIndices returns index definitions for Book',
					(fDone) =>
					{
						libSchemaSQLite.introspectTableIndices('Book',
							(pError, pIndices) =>
							{
								Expect(pError).to.not.exist;
								Expect(pIndices).to.be.an('array');
								Expect(pIndices.length).to.equal(2);

								// Should have AK_M_GUIDBook and IX_M_IDAuthor
								let tmpNames = pIndices.map((pIdx) => { return pIdx.Name; });
								Expect(tmpNames).to.include('AK_M_GUIDBook');
								Expect(tmpNames).to.include('IX_M_IDAuthor');

								let tmpGUIDIndex = pIndices.find((pIdx) => { return pIdx.Name === 'AK_M_GUIDBook'; });
								Expect(tmpGUIDIndex.Unique).to.equal(true);
								Expect(tmpGUIDIndex.Columns).to.deep.equal(['GUIDBook']);

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableForeignKeys returns empty for table without FK constraints',
					(fDone) =>
					{
						// SQLite tables created without REFERENCES have no FK constraints
						libSchemaSQLite.introspectTableForeignKeys('Book',
							(pError, pFKs) =>
							{
								Expect(pError).to.not.exist;
								Expect(pFKs).to.be.an('array');
								// Our Book table was created without REFERENCES clauses
								Expect(pFKs.length).to.equal(0);
								return fDone();
							});
					}
				);

				test
				(
					'introspectTableSchema combines columns and indices for BookIndexed',
					(fDone) =>
					{
						libSchemaSQLite.introspectTableSchema('BookIndexed',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema).to.be.an('object');
								Expect(pSchema.TableName).to.equal('BookIndexed');
								Expect(pSchema.Columns).to.be.an('array');

								// Check that column-level Indexed properties are folded in
								let tmpTitleCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Title'; });
								Expect(tmpTitleCol.Indexed).to.equal(true);
								Expect(tmpTitleCol).to.not.have.property('IndexName');

								let tmpISBNCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'ISBN'; });
								Expect(tmpISBNCol.Indexed).to.equal('unique');
								Expect(tmpISBNCol).to.not.have.property('IndexName');

								return fDone();
							});
					}
				);

				test
				(
					'introspectTableSchema preserves IndexName for custom-named indices',
					(fDone) =>
					{
						libSchemaSQLite.introspectTableSchema('BookCustomIdx',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema.TableName).to.equal('BookCustomIdx');

								// Title has custom IndexName IX_Custom_Title
								let tmpTitleCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'Title'; });
								Expect(tmpTitleCol.Indexed).to.equal(true);
								Expect(tmpTitleCol.IndexName).to.equal('IX_Custom_Title');

								// ISBN has custom IndexName UQ_BookCustomIdx_ISBN
								let tmpISBNCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'ISBN'; });
								Expect(tmpISBNCol.Indexed).to.equal('unique');
								Expect(tmpISBNCol.IndexName).to.equal('UQ_BookCustomIdx_ISBN');

								// YearPublished has auto-generated name → no IndexName
								let tmpYearCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'YearPublished'; });
								Expect(tmpYearCol.Indexed).to.equal(true);
								Expect(tmpYearCol).to.not.have.property('IndexName');

								return fDone();
							});
					}
				);

				test
				(
					'introspectDatabaseSchema returns schemas for all tables',
					(fDone) =>
					{
						libSchemaSQLite.introspectDatabaseSchema(
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;
								Expect(pSchema).to.be.an('object');
								Expect(pSchema.Tables).to.be.an('array');
								Expect(pSchema.Tables.length).to.be.greaterThan(0);

								let tmpTableNames = pSchema.Tables.map((pT) => { return pT.TableName; });
								Expect(tmpTableNames).to.include('Book');
								Expect(tmpTableNames).to.include('BookIndexed');
								Expect(tmpTableNames).to.include('BookCustomIdx');

								return fDone();
							});
					}
				);

				test
				(
					'generateMeadowPackageFromTable produces Meadow package JSON',
					(fDone) =>
					{
						libSchemaSQLite.generateMeadowPackageFromTable('Book',
							(pError, pPackage) =>
							{
								Expect(pError).to.not.exist;
								Expect(pPackage).to.be.an('object');
								Expect(pPackage.Scope).to.equal('Book');
								Expect(pPackage.DefaultIdentifier).to.equal('IDBook');
								Expect(pPackage.Schema).to.be.an('array');
								Expect(pPackage.DefaultObject).to.be.an('object');

								// Verify schema entries
								let tmpIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'IDBook'; });
								Expect(tmpIDEntry.Type).to.equal('AutoIdentity');

								let tmpGUIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'GUIDBook'; });
								Expect(tmpGUIDEntry.Type).to.equal('AutoGUID');

								let tmpTitleEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'Title'; });
								Expect(tmpTitleEntry.Type).to.equal('String');

								// Verify default object
								Expect(pPackage.DefaultObject.IDBook).to.equal(0);
								Expect(pPackage.DefaultObject.GUIDBook).to.equal('');
								Expect(pPackage.DefaultObject.Title).to.equal('');

								return fDone();
							});
					}
				);

				test
				(
					'round-trip: introspect BookIndexed and regenerate matching indices',
					(fDone) =>
					{
						libSchemaSQLite.introspectTableSchema('BookIndexed',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;

								// Use the introspected schema to generate index definitions
								let tmpIndices = libSchemaSQLite.getIndexDefinitionsFromSchema(pSchema);

								// The original BookIndexed had:
								//   AK_M_GUIDBookIndexed (GUID auto)
								//   IX_M_T_BookIndexed_C_Title (Indexed: true)
								//   AK_M_T_BookIndexed_C_ISBN (Indexed: 'unique')
								//   IX_M_IDPublisher (FK auto)
								let tmpNames = tmpIndices.map((pIdx) => { return pIdx.Name; });
								Expect(tmpNames).to.include('AK_M_GUIDBookIndexed');
								Expect(tmpNames).to.include('IX_M_T_BookIndexed_C_Title');
								Expect(tmpNames).to.include('AK_M_T_BookIndexed_C_ISBN');
								Expect(tmpNames).to.include('IX_M_IDPublisher');

								return fDone();
							});
					}
				);

				test
				(
					'round-trip: introspect BookCustomIdx and regenerate matching index names',
					(fDone) =>
					{
						libSchemaSQLite.introspectTableSchema('BookCustomIdx',
							(pError, pSchema) =>
							{
								Expect(pError).to.not.exist;

								// Use the introspected schema to generate index definitions
								let tmpIndices = libSchemaSQLite.getIndexDefinitionsFromSchema(pSchema);

								// The original BookCustomIdx had:
								//   AK_M_GUIDBookCustomIdx (GUID auto)
								//   IX_Custom_Title (IndexName override)
								//   UQ_BookCustomIdx_ISBN (IndexName override, unique)
								//   IX_M_T_BookCustomIdx_C_YearPublished (auto)
								//   IX_M_IDEditor (FK auto)
								let tmpNames = tmpIndices.map((pIdx) => { return pIdx.Name; });
								Expect(tmpNames).to.include('AK_M_GUIDBookCustomIdx');
								Expect(tmpNames).to.include('IX_Custom_Title');
								Expect(tmpNames).to.include('UQ_BookCustomIdx_ISBN');
								Expect(tmpNames).to.include('IX_M_T_BookCustomIdx_C_YearPublished');
								Expect(tmpNames).to.include('IX_M_IDEditor');

								return fDone();
							});
					}
				);

				suite
				(
					'Chinook Database Introspection',
					()=>
					{
						setup(
							(fDone) =>
							{
								// Create Chinook tables (runs once before the suite)
								libSchemaSQLite._Database.exec(_ChinookSQL);
								return fDone();
							});

						test
						(
							'listTables includes all 11 Chinook tables',
							(fDone) =>
							{
								libSchemaSQLite.listTables(
									(pError, pTables) =>
									{
										Expect(pError).to.not.exist;
										Expect(pTables).to.be.an('array');

										let tmpChinookTables = ['Album', 'Artist', 'Customer', 'Employee',
											'Genre', 'Invoice', 'InvoiceLine', 'MediaType',
											'Playlist', 'PlaylistTrack', 'Track'];

										tmpChinookTables.forEach(
											(pTableName) =>
											{
												Expect(pTables).to.include(pTableName);
											});

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableColumns on Track detects all 9 columns',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableColumns('Track',
									(pError, pColumns) =>
									{
										Expect(pError).to.not.exist;
										Expect(pColumns).to.be.an('array');
										Expect(pColumns.length).to.equal(9);

										let tmpTrackId = pColumns.find((pCol) => { return pCol.Column === 'TrackId'; });
										Expect(tmpTrackId.DataType).to.equal('ID');

										let tmpName = pColumns.find((pCol) => { return pCol.Column === 'Name'; });
										Expect(tmpName.DataType).to.equal('String');

										let tmpUnitPrice = pColumns.find((pCol) => { return pCol.Column === 'UnitPrice'; });
										Expect(tmpUnitPrice.DataType).to.equal('Decimal');

										let tmpMilliseconds = pColumns.find((pCol) => { return pCol.Column === 'Milliseconds'; });
										Expect(tmpMilliseconds.DataType).to.equal('Numeric');

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableColumns on Employee detects 15 columns',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableColumns('Employee',
									(pError, pColumns) =>
									{
										Expect(pError).to.not.exist;
										Expect(pColumns.length).to.equal(15);

										let tmpEmployeeId = pColumns.find((pCol) => { return pCol.Column === 'EmployeeId'; });
										Expect(tmpEmployeeId.DataType).to.equal('ID');

										let tmpLastName = pColumns.find((pCol) => { return pCol.Column === 'LastName'; });
										Expect(tmpLastName.DataType).to.equal('String');

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableForeignKeys on Track detects 3 FK relationships',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableForeignKeys('Track',
									(pError, pFKs) =>
									{
										Expect(pError).to.not.exist;
										Expect(pFKs).to.be.an('array');
										Expect(pFKs.length).to.equal(3);

										let tmpAlbumFK = pFKs.find((pFK) => { return pFK.Column === 'AlbumId'; });
										Expect(tmpAlbumFK).to.exist;
										Expect(tmpAlbumFK.ReferencedTable).to.equal('Album');
										Expect(tmpAlbumFK.ReferencedColumn).to.equal('AlbumId');

										let tmpMediaTypeFK = pFKs.find((pFK) => { return pFK.Column === 'MediaTypeId'; });
										Expect(tmpMediaTypeFK).to.exist;
										Expect(tmpMediaTypeFK.ReferencedTable).to.equal('MediaType');

										let tmpGenreFK = pFKs.find((pFK) => { return pFK.Column === 'GenreId'; });
										Expect(tmpGenreFK).to.exist;
										Expect(tmpGenreFK.ReferencedTable).to.equal('Genre');

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableForeignKeys on Employee detects self-referential FK',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableForeignKeys('Employee',
									(pError, pFKs) =>
									{
										Expect(pError).to.not.exist;
										Expect(pFKs).to.be.an('array');
										Expect(pFKs.length).to.equal(1);

										Expect(pFKs[0].Column).to.equal('ReportsTo');
										Expect(pFKs[0].ReferencedTable).to.equal('Employee');
										Expect(pFKs[0].ReferencedColumn).to.equal('EmployeeId');

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableForeignKeys on PlaylistTrack detects 2 FKs',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableForeignKeys('PlaylistTrack',
									(pError, pFKs) =>
									{
										Expect(pError).to.not.exist;
										Expect(pFKs).to.be.an('array');
										Expect(pFKs.length).to.equal(2);

										let tmpPlaylistFK = pFKs.find((pFK) => { return pFK.Column === 'PlaylistId'; });
										Expect(tmpPlaylistFK).to.exist;
										Expect(tmpPlaylistFK.ReferencedTable).to.equal('Playlist');

										let tmpTrackFK = pFKs.find((pFK) => { return pFK.Column === 'TrackId'; });
										Expect(tmpTrackFK).to.exist;
										Expect(tmpTrackFK.ReferencedTable).to.equal('Track');

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableSchema on Track combines columns with FK detection',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableSchema('Track',
									(pError, pSchema) =>
									{
										Expect(pError).to.not.exist;
										Expect(pSchema.TableName).to.equal('Track');
										Expect(pSchema.Columns).to.be.an('array');
										Expect(pSchema.ForeignKeys).to.be.an('array');
										Expect(pSchema.ForeignKeys.length).to.equal(3);

										// FK columns should be upgraded to ForeignKey DataType
										let tmpAlbumIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'AlbumId'; });
										Expect(tmpAlbumIdCol.DataType).to.equal('ForeignKey');

										let tmpMediaTypeIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'MediaTypeId'; });
										Expect(tmpMediaTypeIdCol.DataType).to.equal('ForeignKey');

										let tmpGenreIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'GenreId'; });
										Expect(tmpGenreIdCol.DataType).to.equal('ForeignKey');

										return fDone();
									});
							}
						);

						test
						(
							'introspectTableSchema on Album shows FK to Artist',
							(fDone) =>
							{
								libSchemaSQLite.introspectTableSchema('Album',
									(pError, pSchema) =>
									{
										Expect(pError).to.not.exist;
										Expect(pSchema.TableName).to.equal('Album');
										Expect(pSchema.ForeignKeys.length).to.equal(1);
										Expect(pSchema.ForeignKeys[0].Column).to.equal('ArtistId');
										Expect(pSchema.ForeignKeys[0].ReferencedTable).to.equal('Artist');

										let tmpArtistIdCol = pSchema.Columns.find((pCol) => { return pCol.Column === 'ArtistId'; });
										Expect(tmpArtistIdCol.DataType).to.equal('ForeignKey');

										return fDone();
									});
							}
						);

						test
						(
							'introspectDatabaseSchema includes all Chinook tables',
							(fDone) =>
							{
								libSchemaSQLite.introspectDatabaseSchema(
									(pError, pSchema) =>
									{
										Expect(pError).to.not.exist;
										Expect(pSchema.Tables).to.be.an('array');

										let tmpTableNames = pSchema.Tables.map((pT) => { return pT.TableName; });
										Expect(tmpTableNames).to.include('Track');
										Expect(tmpTableNames).to.include('Album');
										Expect(tmpTableNames).to.include('Artist');
										Expect(tmpTableNames).to.include('Invoice');
										Expect(tmpTableNames).to.include('InvoiceLine');
										Expect(tmpTableNames).to.include('PlaylistTrack');
										Expect(tmpTableNames).to.include('Employee');
										Expect(tmpTableNames).to.include('Customer');

										// Verify Track schema has FKs detected
										let tmpTrack = pSchema.Tables.find((pT) => { return pT.TableName === 'Track'; });
										Expect(tmpTrack.ForeignKeys.length).to.equal(3);

										return fDone();
									});
							}
						);

						test
						(
							'generateMeadowPackageFromTable on Album produces valid package',
							(fDone) =>
							{
								libSchemaSQLite.generateMeadowPackageFromTable('Album',
									(pError, pPackage) =>
									{
										Expect(pError).to.not.exist;
										Expect(pPackage.Scope).to.equal('Album');
										Expect(pPackage.DefaultIdentifier).to.equal('AlbumId');
										Expect(pPackage.Schema).to.be.an('array');
										Expect(pPackage.DefaultObject).to.be.an('object');

										let tmpIDEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'AlbumId'; });
										Expect(tmpIDEntry.Type).to.equal('AutoIdentity');

										let tmpTitleEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'Title'; });
										Expect(tmpTitleEntry.Type).to.equal('String');

										return fDone();
									});
							}
						);

						test
						(
							'generateMeadowPackageFromTable on Track handles FKs and Decimal',
							(fDone) =>
							{
								libSchemaSQLite.generateMeadowPackageFromTable('Track',
									(pError, pPackage) =>
									{
										Expect(pError).to.not.exist;
										Expect(pPackage.Scope).to.equal('Track');
										Expect(pPackage.DefaultIdentifier).to.equal('TrackId');

										let tmpUnitPriceEntry = pPackage.Schema.find((pEntry) => { return pEntry.Column === 'UnitPrice'; });
										Expect(tmpUnitPriceEntry).to.exist;

										return fDone();
									});
							}
						);
					}
				);
			}
		);
	}
);
