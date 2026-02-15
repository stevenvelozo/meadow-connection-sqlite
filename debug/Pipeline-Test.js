/*
	Full pipeline test for meadow-connection-sqlite:
	Connect → Create Table → Insert → Read → Update → Delete → Transactions → Close
*/
const libFable = require('fable');
const libMeadowConnectionSQLite = require('../source/Meadow-Connection-SQLite.js');
const libFS = require('fs');

// Clean up any leftover test database
const DB_PATH = './dist/PipelineTest.db';
if (libFS.existsSync(DB_PATH))
{
	libFS.unlinkSync(DB_PATH);
}

let _Fable = new libFable(
	{
		"Product": "MeadowSQLitePipelineTest",
		"ProductVersion": "1.0.0",
		"UUID": { "DataCenter": 0, "Worker": 0 },
		"LogStreams": [{ "streamtype": "console" }],
		"SQLite": { "SQLiteFilePath": DB_PATH }
	});

// 1. Register and instantiate the provider
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

_Fable.log.info('--- Step 1: Connect ---');
_Fable.MeadowSQLiteProvider.connectAsync(
	(pError, pDatabase) =>
	{
		if (pError)
		{
			_Fable.log.error(`Connection failed: ${pError}`);
			process.exit(1);
		}
		_Fable.log.info(`Connected: ${_Fable.MeadowSQLiteProvider.connected}`);

		let tmpDB = _Fable.MeadowSQLiteProvider.db;

		// 2. Create a table using SQLite-compatible SQL
		_Fable.log.info('--- Step 2: Create Table ---');
		tmpDB.exec(`
			CREATE TABLE IF NOT EXISTS Book (
				IDBook INTEGER PRIMARY KEY AUTOINCREMENT,
				GUIDBook TEXT DEFAULT '00000000-0000-0000-0000-000000000000',
				Title TEXT DEFAULT '',
				Author TEXT DEFAULT '',
				YearPublished INTEGER DEFAULT 0,
				Price REAL DEFAULT 0.0,
				CreateDate TEXT DEFAULT (datetime('now')),
				UpdateDate TEXT DEFAULT (datetime('now'))
			)
		`);
		_Fable.log.info('Table "Book" created.');

		// 3. Insert rows
		_Fable.log.info('--- Step 3: Insert ---');
		let tmpInsert = tmpDB.prepare(
			`INSERT INTO Book (GUIDBook, Title, Author, YearPublished, Price) VALUES (?, ?, ?, ?, ?)`
		);

		let tmpResult1 = tmpInsert.run(_Fable.fable.getUUID(), 'The Hobbit', 'J.R.R. Tolkien', 1937, 12.99);
		_Fable.log.info(`Inserted IDBook=${tmpResult1.lastInsertRowid}`);

		let tmpResult2 = tmpInsert.run(_Fable.fable.getUUID(), 'Dune', 'Frank Herbert', 1965, 14.99);
		_Fable.log.info(`Inserted IDBook=${tmpResult2.lastInsertRowid}`);

		let tmpResult3 = tmpInsert.run(_Fable.fable.getUUID(), 'Neuromancer', 'William Gibson', 1984, 11.50);
		_Fable.log.info(`Inserted IDBook=${tmpResult3.lastInsertRowid}`);

		// 4. Read all rows
		_Fable.log.info('--- Step 4: Read All ---');
		let tmpAllBooks = tmpDB.prepare(`SELECT * FROM Book`).all();
		_Fable.log.info(`Found ${tmpAllBooks.length} books:`);
		for (let i = 0; i < tmpAllBooks.length; i++)
		{
			_Fable.log.info(`  [${tmpAllBooks[i].IDBook}] "${tmpAllBooks[i].Title}" by ${tmpAllBooks[i].Author} (${tmpAllBooks[i].YearPublished}) - $${tmpAllBooks[i].Price}`);
		}

		// 5. Read single row
		_Fable.log.info('--- Step 5: Read One ---');
		let tmpOneBook = tmpDB.prepare(`SELECT * FROM Book WHERE IDBook = ?`).get(2);
		_Fable.log.info(`Single book: "${tmpOneBook.Title}" by ${tmpOneBook.Author}`);

		// 6. Update
		_Fable.log.info('--- Step 6: Update ---');
		let tmpUpdate = tmpDB.prepare(`UPDATE Book SET Price = ?, UpdateDate = datetime('now') WHERE IDBook = ?`);
		let tmpUpdateResult = tmpUpdate.run(16.99, 2);
		_Fable.log.info(`Updated ${tmpUpdateResult.changes} row(s) — Dune price is now $16.99`);

		let tmpUpdatedBook = tmpDB.prepare(`SELECT * FROM Book WHERE IDBook = ?`).get(2);
		_Fable.log.info(`Verified: "${tmpUpdatedBook.Title}" price = $${tmpUpdatedBook.Price}`);

		// 7. Delete
		_Fable.log.info('--- Step 7: Delete ---');
		let tmpDelete = tmpDB.prepare(`DELETE FROM Book WHERE IDBook = ?`);
		let tmpDeleteResult = tmpDelete.run(3);
		_Fable.log.info(`Deleted ${tmpDeleteResult.changes} row(s) — Neuromancer removed`);

		let tmpRemainingBooks = tmpDB.prepare(`SELECT * FROM Book`).all();
		_Fable.log.info(`Remaining books: ${tmpRemainingBooks.length}`);

		// 8. Transaction
		_Fable.log.info('--- Step 8: Transaction ---');
		let tmpBulkInsert = tmpDB.transaction(
			(pBooks) =>
			{
				let tmpBulkStmt = tmpDB.prepare(
					`INSERT INTO Book (GUIDBook, Title, Author, YearPublished, Price) VALUES (?, ?, ?, ?, ?)`
				);
				for (let tmpBook of pBooks)
				{
					tmpBulkStmt.run(tmpBook.GUID, tmpBook.Title, tmpBook.Author, tmpBook.Year, tmpBook.Price);
				}
			});

		tmpBulkInsert(
			[
				{ GUID: _Fable.fable.getUUID(), Title: 'Snow Crash', Author: 'Neal Stephenson', Year: 1992, Price: 13.99 },
				{ GUID: _Fable.fable.getUUID(), Title: 'Hyperion', Author: 'Dan Simmons', Year: 1989, Price: 15.50 },
				{ GUID: _Fable.fable.getUUID(), Title: 'Foundation', Author: 'Isaac Asimov', Year: 1951, Price: 10.99 }
			]);
		_Fable.log.info('Bulk insert (3 books) committed in a single transaction.');

		let tmpFinalBooks = tmpDB.prepare(`SELECT * FROM Book ORDER BY IDBook`).all();
		_Fable.log.info(`Final book count: ${tmpFinalBooks.length}`);
		for (let i = 0; i < tmpFinalBooks.length; i++)
		{
			_Fable.log.info(`  [${tmpFinalBooks[i].IDBook}] "${tmpFinalBooks[i].Title}" by ${tmpFinalBooks[i].Author} ($${tmpFinalBooks[i].Price})`);
		}

		// 9. Aggregate query
		_Fable.log.info('--- Step 9: Aggregates ---');
		let tmpStats = tmpDB.prepare(`SELECT COUNT(*) as BookCount, AVG(Price) as AvgPrice, SUM(Price) as TotalValue FROM Book`).get();
		_Fable.log.info(`Books: ${tmpStats.BookCount}, Average price: $${tmpStats.AvgPrice.toFixed(2)}, Total value: $${tmpStats.TotalValue.toFixed(2)}`);

		// 10. Close
		_Fable.log.info('--- Step 10: Close ---');
		tmpDB.close();
		_Fable.log.info('Database closed. Pipeline test complete!');
	});
