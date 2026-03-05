/**
* Meadow SQLite Schema Provider
*
* Handles table creation, dropping, and DDL generation for SQLite.
* Separated from the connection provider to allow independent extension
* for indexing, foreign keys, and other schema operations.
*
* @author Steven Velozo <steven@velozo.com>
*/
const libFableServiceProviderBase = require('fable-serviceproviderbase');

class MeadowSchemaSQLite extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'MeadowSchemaSQLite';

		// Reference to the database connection, set by the connection provider
		this._Database = false;
	}

	/**
	 * Set the database reference for executing DDL statements.
	 * @param {object} pDatabase - better-sqlite3 database instance
	 * @returns {MeadowSchemaSQLite} this (for chaining)
	 */
	setDatabase(pDatabase)
	{
		this._Database = pDatabase;
		return this;
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
				case 'JSON':
					tmpCreateTableStatement += `        ${tmpColumn.Column} TEXT`;
					break;
				case 'JSONProxy':
					tmpCreateTableStatement += `        ${tmpColumn.StorageColumn} TEXT`;
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
			this._Database.exec(tmpCreateTableStatement);
			this.log.info(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} Success`);
			return fCallback();
		}
		catch (pError)
		{
			this.log.error(`Meadow-SQLite CREATE TABLE ${pMeadowTableSchema.TableName} failed!`, pError);
			return fCallback(pError);
		}
	}

	// ========================================================================
	// Index Generation
	// ========================================================================

	/**
	 * Derive index definitions from a Meadow table schema.
	 *
	 * Automatically generates indices for:
	 *   - GUID columns      -> unique index  AK_M_{Column}
	 *   - ForeignKey columns -> regular index IX_M_{Column}
	 *
	 * Column-level Indexed property:
	 *   - Indexed: true     -> regular index IX_M_T_{Table}_C_{Column}
	 *   - Indexed: 'unique' -> unique index  AK_M_T_{Table}_C_{Column}
	 *   - IndexName overrides the auto-generated name (for round-trip fidelity)
	 *
	 * Also includes any explicit entries from pMeadowTableSchema.Indices[]
	 * (for multi-column composite indices).
	 *
	 * Each index definition is:
	 *   { Name, TableName, Columns[], Unique, Strategy }
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {Array} Array of index definition objects
	 */
	getIndexDefinitionsFromSchema(pMeadowTableSchema)
	{
		let tmpIndices = [];
		let tmpTableName = pMeadowTableSchema.TableName;

		// Auto-detect from column types
		for (let j = 0; j < pMeadowTableSchema.Columns.length; j++)
		{
			let tmpColumn = pMeadowTableSchema.Columns[j];

			switch (tmpColumn.DataType)
			{
				case 'GUID':
					tmpIndices.push(
						{
							Name: `AK_M_${tmpColumn.Column}`,
							TableName: tmpTableName,
							Columns: [tmpColumn.Column],
							Unique: true,
							Strategy: ''
						});
					break;
				case 'ForeignKey':
					tmpIndices.push(
						{
							Name: `IX_M_${tmpColumn.Column}`,
							TableName: tmpTableName,
							Columns: [tmpColumn.Column],
							Unique: false,
							Strategy: ''
						});
					break;
				default:
					// Column-level Indexed property: generates a single-column index
					// with a consistent naming convention.
					//   Indexed: true     -> IX_M_T_{Table}_C_{Column}  (regular)
					//   Indexed: 'unique' -> AK_M_T_{Table}_C_{Column}  (unique)
					// Optional IndexName property overrides the auto-generated name.
					if (tmpColumn.Indexed)
					{
						let tmpIsUnique = (tmpColumn.Indexed === 'unique');
						let tmpPrefix = tmpIsUnique ? 'AK_M_T' : 'IX_M_T';
						let tmpAutoName = `${tmpPrefix}_${tmpTableName}_C_${tmpColumn.Column}`;
						tmpIndices.push(
							{
								Name: tmpColumn.IndexName || tmpAutoName,
								TableName: tmpTableName,
								Columns: [tmpColumn.Column],
								Unique: tmpIsUnique,
								Strategy: ''
							});
					}
					break;
			}
		}

		// Include any explicitly defined indices on the schema
		if (Array.isArray(pMeadowTableSchema.Indices))
		{
			for (let k = 0; k < pMeadowTableSchema.Indices.length; k++)
			{
				let tmpExplicitIndex = pMeadowTableSchema.Indices[k];
				tmpIndices.push(
					{
						Name: tmpExplicitIndex.Name || `IX_${tmpTableName}_${k}`,
						TableName: tmpTableName,
						Columns: Array.isArray(tmpExplicitIndex.Columns) ? tmpExplicitIndex.Columns : [tmpExplicitIndex.Columns],
						Unique: tmpExplicitIndex.Unique || false,
						Strategy: tmpExplicitIndex.Strategy || ''
					});
			}
		}

		return tmpIndices;
	}

	/**
	 * Build the column list for an index, comma-separated.
	 * @param {Array} pColumns - Array of column name strings
	 * @returns {string}
	 */
	_buildColumnList(pColumns)
	{
		return pColumns.join(', ');
	}

	/**
	 * Generate a full idempotent SQL script for creating all indices on a table.
	 *
	 * SQLite supports CREATE INDEX IF NOT EXISTS natively, so the
	 * idempotent script is straightforward.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {string} Complete SQL script
	 */
	generateCreateIndexScript(pMeadowTableSchema)
	{
		let tmpIndices = this.getIndexDefinitionsFromSchema(pMeadowTableSchema);
		let tmpTableName = pMeadowTableSchema.TableName;

		if (tmpIndices.length === 0)
		{
			return `-- No indices to create for ${tmpTableName}\n`;
		}

		let tmpScript = `-- Index Definitions for ${tmpTableName} -- Generated ${new Date().toJSON()}\n\n`;

		for (let i = 0; i < tmpIndices.length; i++)
		{
			let tmpIndex = tmpIndices[i];
			let tmpColumnList = this._buildColumnList(tmpIndex.Columns);
			let tmpCreateKeyword = tmpIndex.Unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';

			tmpScript += `-- Index: ${tmpIndex.Name}\n`;
			tmpScript += `${tmpCreateKeyword} IF NOT EXISTS ${tmpIndex.Name} ON ${tmpIndex.TableName}(${tmpColumnList});\n\n`;
		}

		return tmpScript;
	}

	/**
	 * Generate an array of individual CREATE INDEX SQL statements for a table.
	 *
	 * Each entry is an object with:
	 *   { Name, Statement, CheckStatement }
	 *
	 * - Statement: the raw CREATE [UNIQUE] INDEX ... SQL
	 * - CheckStatement: a SELECT against sqlite_master that returns the count
	 *   of matching indices (0 = does not exist)
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @returns {Array} Array of { Name, Statement, CheckStatement } objects
	 */
	generateCreateIndexStatements(pMeadowTableSchema)
	{
		let tmpIndices = this.getIndexDefinitionsFromSchema(pMeadowTableSchema);
		let tmpStatements = [];

		for (let i = 0; i < tmpIndices.length; i++)
		{
			let tmpIndex = tmpIndices[i];
			let tmpColumnList = this._buildColumnList(tmpIndex.Columns);
			let tmpCreateKeyword = tmpIndex.Unique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';

			tmpStatements.push(
				{
					Name: tmpIndex.Name,
					Statement: `${tmpCreateKeyword} ${tmpIndex.Name} ON ${tmpIndex.TableName}(${tmpColumnList})`,
					CheckStatement: `SELECT COUNT(*) AS IndexExists FROM sqlite_master WHERE type = 'index' AND name = '${tmpIndex.Name}'`
				});
		}

		return tmpStatements;
	}

	/**
	 * Programmatically create a single index on the database.
	 *
	 * Uses CREATE INDEX IF NOT EXISTS for idempotent execution.
	 * SQLite is synchronous via better-sqlite3.
	 *
	 * @param {object} pIndexStatement - Object from generateCreateIndexStatements()
	 * @param {Function} fCallback - callback(pError)
	 */
	createIndex(pIndexStatement, fCallback)
	{
		if (!this._Database)
		{
			this.log.error(`Meadow-SQLite CREATE INDEX ${pIndexStatement.Name} failed: not connected.`);
			return fCallback(new Error('Not connected to SQLite'));
		}

		try
		{
			// Inject IF NOT EXISTS for idempotent execution
			let tmpStatement = pIndexStatement.Statement.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ');
			this._Database.exec(tmpStatement);
			this.log.info(`Meadow-SQLite CREATE INDEX ${pIndexStatement.Name} executed successfully.`);
			return fCallback();
		}
		catch (pError)
		{
			this.log.error(`Meadow-SQLite CREATE INDEX ${pIndexStatement.Name} failed!`, pError);
			return fCallback(pError);
		}
	}

	/**
	 * Programmatically create all indices for a single table.
	 *
	 * @param {object} pMeadowTableSchema - Meadow table schema object
	 * @param {Function} fCallback - callback(pError)
	 */
	createIndices(pMeadowTableSchema, fCallback)
	{
		let tmpStatements = this.generateCreateIndexStatements(pMeadowTableSchema);

		if (tmpStatements.length === 0)
		{
			this.log.info(`No indices to create for ${pMeadowTableSchema.TableName}.`);
			return fCallback();
		}

		this.fable.Utility.eachLimit(tmpStatements, 1,
			(pStatement, fCreateComplete) =>
			{
				return this.createIndex(pStatement, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-SQLite Error creating indices for ${pMeadowTableSchema.TableName}: ${pCreateError}`, pCreateError);
				}
				else
				{
					this.log.info(`Done creating indices for ${pMeadowTableSchema.TableName}!`);
				}
				return fCallback(pCreateError);
			});
	}

	/**
	 * Programmatically create all indices for all tables in a schema.
	 *
	 * @param {object} pMeadowSchema - Meadow schema object with Tables array
	 * @param {Function} fCallback - callback(pError)
	 */
	createAllIndices(pMeadowSchema, fCallback)
	{
		this.fable.Utility.eachLimit(pMeadowSchema.Tables, 1,
			(pTable, fCreateComplete) =>
			{
				return this.createIndices(pTable, fCreateComplete);
			},
			(pCreateError) =>
			{
				if (pCreateError)
				{
					this.log.error(`Meadow-SQLite Error creating indices from schema: ${pCreateError}`, pCreateError);
				}
				this.log.info('Done creating all indices!');
				return fCallback(pCreateError);
			});
	}
	// ========================================================================
	// Database Introspection
	// ========================================================================

	/**
	 * List all user tables in the connected SQLite database.
	 *
	 * @param {Function} fCallback - callback(pError, pTableNames)
	 */
	listTables(fCallback)
	{
		if (!this._Database)
		{
			return fCallback(new Error('Not connected to SQLite'));
		}

		try
		{
			let tmpRows = this._Database.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
			).all();
			let tmpNames = tmpRows.map((pRow) => { return pRow.name; });
			return fCallback(null, tmpNames);
		}
		catch (pError)
		{
			this.log.error('Meadow-SQLite listTables failed!', pError);
			return fCallback(pError);
		}
	}

	/**
	 * Map a SQLite native type string to a Meadow DataType.
	 *
	 * Uses conservative heuristics:
	 *   1. Primary key with AUTOINCREMENT → ID
	 *   2. Column name contains "GUID" and type is TEXT → GUID
	 *   3. Foreign key constraint exists → ForeignKey
	 *   4. Native type mapping for straightforward cases
	 *
	 * @param {object} pColumnInfo - PRAGMA table_info row
	 * @param {string} pColumnInfo.name - Column name
	 * @param {string} pColumnInfo.type - Native SQLite type (e.g. 'TEXT', 'INTEGER')
	 * @param {number} pColumnInfo.pk - 1 if primary key, 0 otherwise
	 * @param {boolean} pIsAutoIncrement - Whether this column has AUTOINCREMENT
	 * @param {Set} pForeignKeyColumns - Set of column names that have FK constraints
	 * @returns {object} { DataType, Size }
	 */
	_mapSQLiteTypeToMeadow(pColumnInfo, pIsAutoIncrement, pForeignKeyColumns)
	{
		let tmpName = pColumnInfo.name;
		let tmpType = (pColumnInfo.type || '').toUpperCase().trim();

		// Priority 1: Primary key with auto-increment → ID
		if (pColumnInfo.pk === 1 && pIsAutoIncrement)
		{
			return { DataType: 'ID', Size: '' };
		}

		// Priority 2: Column name contains "GUID" and type is TEXT-like → GUID
		if (tmpName.toUpperCase().indexOf('GUID') >= 0 && (tmpType === 'TEXT' || tmpType === '' || tmpType.indexOf('VARCHAR') >= 0 || tmpType.indexOf('CHAR') >= 0))
		{
			return { DataType: 'GUID', Size: '' };
		}

		// Priority 3: Has FK constraint → ForeignKey
		if (pForeignKeyColumns && pForeignKeyColumns.has(tmpName))
		{
			return { DataType: 'ForeignKey', Size: '' };
		}

		// Priority 4: Native type mapping
		if (tmpType === 'REAL' || tmpType.indexOf('DOUBLE') >= 0 || tmpType.indexOf('FLOAT') >= 0)
		{
			return { DataType: 'Decimal', Size: '' };
		}

		if (tmpType.indexOf('DECIMAL') >= 0 || tmpType.indexOf('NUMERIC') >= 0)
		{
			// Extract precision from DECIMAL(p,s)
			let tmpMatch = tmpType.match(/\((\d+(?:,\d+)?)\)/);
			return { DataType: 'Decimal', Size: tmpMatch ? tmpMatch[1] : '' };
		}

		if (tmpType === 'TEXT')
		{
			// Distinguish between String and Text: if notnull with default '' → String, else Text
			if (pColumnInfo.notnull === 1 && pColumnInfo.dflt_value === "''")
			{
				return { DataType: 'String', Size: '' };
			}
			return { DataType: 'Text', Size: '' };
		}

		if (tmpType.indexOf('VARCHAR') >= 0 || tmpType.indexOf('CHAR') >= 0)
		{
			let tmpMatch = tmpType.match(/\((\d+)\)/);
			return { DataType: 'String', Size: tmpMatch ? tmpMatch[1] : '' };
		}

		if (tmpType === 'INTEGER' || tmpType === 'INT' || tmpType.indexOf('INT') >= 0)
		{
			// Could be Boolean or Numeric; check for boolean hints
			if (pColumnInfo.notnull === 1 && pColumnInfo.dflt_value === '0')
			{
				// Check for boolean naming patterns
				let tmpLowerName = tmpName.toLowerCase();
				if (tmpLowerName.indexOf('is') === 0 || tmpLowerName.indexOf('has') === 0 ||
					tmpLowerName.indexOf('in') === 0 || tmpLowerName === 'deleted' ||
					tmpLowerName === 'active' || tmpLowerName === 'enabled')
				{
					return { DataType: 'Boolean', Size: '' };
				}
			}
			return { DataType: 'Numeric', Size: '' };
		}

		// Default fallback
		return { DataType: 'Text', Size: '' };
	}

	/**
	 * Get column definitions for a single table.
	 *
	 * Returns DDL-level column objects with DataType inferred from native types.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pColumns)
	 */
	introspectTableColumns(pTableName, fCallback)
	{
		if (!this._Database)
		{
			return fCallback(new Error('Not connected to SQLite'));
		}

		try
		{
			// Get column info
			let tmpColumns = this._Database.prepare(`PRAGMA table_info('${pTableName}')`).all();

			// Check if the table has AUTOINCREMENT by inspecting sqlite_master
			let tmpCreateSQL = this._Database.prepare(
				"SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?"
			).get(pTableName);
			let tmpHasAutoIncrement = tmpCreateSQL && tmpCreateSQL.sql &&
				tmpCreateSQL.sql.toUpperCase().indexOf('AUTOINCREMENT') >= 0;

			// Get foreign keys to identify FK columns
			let tmpForeignKeys = this._Database.prepare(`PRAGMA foreign_key_list('${pTableName}')`).all();
			let tmpFKColumnSet = new Set(tmpForeignKeys.map((pFK) => { return pFK.from; }));

			let tmpResult = [];
			for (let i = 0; i < tmpColumns.length; i++)
			{
				let tmpCol = tmpColumns[i];
				let tmpIsAutoIncrement = tmpHasAutoIncrement && tmpCol.pk === 1;
				let tmpTypeInfo = this._mapSQLiteTypeToMeadow(tmpCol, tmpIsAutoIncrement, tmpFKColumnSet);

				let tmpColumnDef = {
					Column: tmpCol.name,
					DataType: tmpTypeInfo.DataType
				};

				if (tmpTypeInfo.Size)
				{
					tmpColumnDef.Size = tmpTypeInfo.Size;
				}

				tmpResult.push(tmpColumnDef);
			}

			return fCallback(null, tmpResult);
		}
		catch (pError)
		{
			this.log.error(`Meadow-SQLite introspectTableColumns for ${pTableName} failed!`, pError);
			return fCallback(pError);
		}
	}

	/**
	 * Get raw index definitions for a single table from the database.
	 *
	 * Returns each index as: { Name, Columns[], Unique }
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pIndices)
	 */
	introspectTableIndices(pTableName, fCallback)
	{
		if (!this._Database)
		{
			return fCallback(new Error('Not connected to SQLite'));
		}

		try
		{
			let tmpIndexList = this._Database.prepare(`PRAGMA index_list('${pTableName}')`).all();
			let tmpIndices = [];

			for (let i = 0; i < tmpIndexList.length; i++)
			{
				let tmpIdx = tmpIndexList[i];

				// Skip auto-generated indices (origin 'pk' for primary key)
				if (tmpIdx.origin === 'pk')
				{
					continue;
				}

				let tmpIndexInfo = this._Database.prepare(`PRAGMA index_info('${tmpIdx.name}')`).all();
				let tmpColumnNames = tmpIndexInfo.map((pInfo) => { return pInfo.name; });

				tmpIndices.push(
					{
						Name: tmpIdx.name,
						Columns: tmpColumnNames,
						Unique: tmpIdx.unique === 1
					});
			}

			return fCallback(null, tmpIndices);
		}
		catch (pError)
		{
			this.log.error(`Meadow-SQLite introspectTableIndices for ${pTableName} failed!`, pError);
			return fCallback(pError);
		}
	}

	/**
	 * Get foreign key relationships for a single table.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pForeignKeys)
	 */
	introspectTableForeignKeys(pTableName, fCallback)
	{
		if (!this._Database)
		{
			return fCallback(new Error('Not connected to SQLite'));
		}

		try
		{
			let tmpForeignKeys = this._Database.prepare(`PRAGMA foreign_key_list('${pTableName}')`).all();
			let tmpResult = [];

			for (let i = 0; i < tmpForeignKeys.length; i++)
			{
				let tmpFK = tmpForeignKeys[i];
				tmpResult.push(
					{
						Column: tmpFK.from,
						ReferencedTable: tmpFK.table,
						ReferencedColumn: tmpFK.to
					});
			}

			return fCallback(null, tmpResult);
		}
		catch (pError)
		{
			this.log.error(`Meadow-SQLite introspectTableForeignKeys for ${pTableName} failed!`, pError);
			return fCallback(pError);
		}
	}

	/**
	 * Classify an index for round-trip fidelity.
	 *
	 * Determines how a database index should be represented in the Meadow
	 * schema: as a column-level Indexed property (with or without IndexName),
	 * as a GUID/FK auto-index (skip), or as an explicit Indices[] entry.
	 *
	 * @param {object} pIndex - { Name, Columns[], Unique }
	 * @param {string} pTableName - Table name for pattern matching
	 * @returns {object} { type, column, indexed, indexName }
	 *   type: 'column-auto' | 'column-named' | 'guid-auto' | 'fk-auto' | 'explicit'
	 */
	_classifyIndex(pIndex, pTableName)
	{
		// Multi-column indices always go in Indices[]
		if (pIndex.Columns.length !== 1)
		{
			return { type: 'explicit' };
		}

		let tmpColumn = pIndex.Columns[0];
		let tmpName = pIndex.Name;

		// Check for auto-detected GUID index: AK_M_{Column}
		if (tmpName === `AK_M_${tmpColumn}`)
		{
			return { type: 'guid-auto', column: tmpColumn };
		}

		// Check for auto-detected FK index: IX_M_{Column}
		if (tmpName === `IX_M_${tmpColumn}`)
		{
			return { type: 'fk-auto', column: tmpColumn };
		}

		// Check for auto-generated column-level index: IX_M_T_{Table}_C_{Column}
		let tmpRegularAutoName = `IX_M_T_${pTableName}_C_${tmpColumn}`;
		if (tmpName === tmpRegularAutoName && !pIndex.Unique)
		{
			return { type: 'column-auto', column: tmpColumn, indexed: true };
		}

		// Check for auto-generated unique column-level index: AK_M_T_{Table}_C_{Column}
		let tmpUniqueAutoName = `AK_M_T_${pTableName}_C_${tmpColumn}`;
		if (tmpName === tmpUniqueAutoName && pIndex.Unique)
		{
			return { type: 'column-auto', column: tmpColumn, indexed: 'unique' };
		}

		// Any other single-column index → column-level with IndexName
		return {
			type: 'column-named',
			column: tmpColumn,
			indexed: pIndex.Unique ? 'unique' : true,
			indexName: tmpName
		};
	}

	/**
	 * Generate a complete DDL-level schema for a single table.
	 *
	 * Combines introspected columns + indices + foreign keys.
	 * Single-column indices are folded into column Indexed/IndexName properties.
	 * Multi-column indices go in the Indices[] array.
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pTableSchema)
	 */
	introspectTableSchema(pTableName, fCallback)
	{
		this.introspectTableColumns(pTableName,
			(pColumnError, pColumns) =>
			{
				if (pColumnError)
				{
					return fCallback(pColumnError);
				}

				this.introspectTableIndices(pTableName,
					(pIndexError, pIndices) =>
					{
						if (pIndexError)
						{
							return fCallback(pIndexError);
						}

						this.introspectTableForeignKeys(pTableName,
							(pFKError, pForeignKeys) =>
							{
								if (pFKError)
								{
									return fCallback(pFKError);
								}

								// Build a column lookup for folding index info
								let tmpColumnMap = {};
								for (let i = 0; i < pColumns.length; i++)
								{
									tmpColumnMap[pColumns[i].Column] = pColumns[i];
								}

								let tmpExplicitIndices = [];

								// Classify and fold each index
								for (let i = 0; i < pIndices.length; i++)
								{
									let tmpClassification = this._classifyIndex(pIndices[i], pTableName);

									switch (tmpClassification.type)
									{
										case 'column-auto':
											if (tmpColumnMap[tmpClassification.column])
											{
												tmpColumnMap[tmpClassification.column].Indexed = tmpClassification.indexed;
											}
											break;
										case 'column-named':
											if (tmpColumnMap[tmpClassification.column])
											{
												tmpColumnMap[tmpClassification.column].Indexed = tmpClassification.indexed;
												tmpColumnMap[tmpClassification.column].IndexName = tmpClassification.indexName;
											}
											break;
										case 'guid-auto':
											// If the column wasn't detected as GUID,
											// upgrade it based on AK_M_{Column} naming evidence.
											if (tmpColumnMap[tmpClassification.column] &&
												tmpColumnMap[tmpClassification.column].DataType !== 'GUID')
											{
												tmpColumnMap[tmpClassification.column].DataType = 'GUID';
											}
											break;
										case 'fk-auto':
											// If the column wasn't detected as ForeignKey
											// (e.g. no REFERENCES clause in SQLite), upgrade it
											// based on IX_M_{Column} naming pattern evidence.
											if (tmpColumnMap[tmpClassification.column] &&
												tmpColumnMap[tmpClassification.column].DataType !== 'ForeignKey')
											{
												tmpColumnMap[tmpClassification.column].DataType = 'ForeignKey';
											}
											// Skip — handled by DataType
											break;
										case 'explicit':
											tmpExplicitIndices.push(
												{
													Name: pIndices[i].Name,
													Columns: pIndices[i].Columns,
													Unique: pIndices[i].Unique
												});
											break;
									}
								}

								let tmpSchema = {
									TableName: pTableName,
									Columns: pColumns
								};

								if (tmpExplicitIndices.length > 0)
								{
									tmpSchema.Indices = tmpExplicitIndices;
								}

								if (pForeignKeys.length > 0)
								{
									tmpSchema.ForeignKeys = pForeignKeys;
								}

								return fCallback(null, tmpSchema);
							});
					});
			});
	}

	/**
	 * Generate DDL schemas for ALL tables in the database.
	 *
	 * @param {Function} fCallback - callback(pError, pSchema)
	 */
	introspectDatabaseSchema(fCallback)
	{
		this.listTables(
			(pListError, pTableNames) =>
			{
				if (pListError)
				{
					return fCallback(pListError);
				}

				let tmpTables = [];
				this.fable.Utility.eachLimit(pTableNames, 1,
					(pTableName, fNext) =>
					{
						this.introspectTableSchema(pTableName,
							(pTableError, pTableSchema) =>
							{
								if (pTableError)
								{
									return fNext(pTableError);
								}
								tmpTables.push(pTableSchema);
								return fNext();
							});
					},
					(pError) =>
					{
						if (pError)
						{
							this.log.error(`Meadow-SQLite introspectDatabaseSchema failed: ${pError}`, pError);
							return fCallback(pError);
						}
						return fCallback(null, { Tables: tmpTables });
					});
			});
	}

	/**
	 * Map a Meadow DataType to a Meadow Package JSON Type.
	 *
	 * @param {string} pDataType - Meadow DDL-level DataType
	 * @param {string} pColumnName - Column name (for magic column detection)
	 * @returns {string} Meadow Package Type
	 */
	_mapDataTypeToMeadowType(pDataType, pColumnName)
	{
		// Magic column detection
		let tmpLowerName = pColumnName.toLowerCase();
		switch (tmpLowerName)
		{
			case 'createdate':
				return 'CreateDate';
			case 'creatingiduser':
				return 'CreateIDUser';
			case 'updatedate':
				return 'UpdateDate';
			case 'updatingiduser':
				return 'UpdateIDUser';
			case 'deletedate':
				return 'DeleteDate';
			case 'deletingiduser':
				return 'DeleteIDUser';
			case 'deleted':
				return 'Deleted';
		}

		switch (pDataType)
		{
			case 'ID':
				return 'AutoIdentity';
			case 'GUID':
				return 'AutoGUID';
			case 'ForeignKey':
				return 'Numeric';
			case 'Numeric':
				return 'Numeric';
			case 'Decimal':
				return 'Numeric';
			case 'String':
				return 'String';
			case 'Text':
				return 'String';
			case 'DateTime':
				return 'DateTime';
			case 'Boolean':
				return 'Boolean';
			case 'JSON':
				return 'JSON';
			case 'JSONProxy':
				return 'JSONProxy';
			default:
				return 'String';
		}
	}

	/**
	 * Get a sensible default value for a Meadow DataType.
	 *
	 * @param {string} pDataType - Meadow DDL-level DataType
	 * @returns {*} Default value
	 */
	_getDefaultValue(pDataType)
	{
		switch (pDataType)
		{
			case 'ID':
				return 0;
			case 'GUID':
				return '';
			case 'ForeignKey':
				return 0;
			case 'Numeric':
				return 0;
			case 'Decimal':
				return 0.0;
			case 'String':
				return '';
			case 'Text':
				return '';
			case 'DateTime':
				return '';
			case 'Boolean':
				return false;
			case 'JSON':
				return {};
			case 'JSONProxy':
				return {};
			default:
				return '';
		}
	}

	/**
	 * Generate a Meadow package JSON for a single table.
	 *
	 * Produces the format consumed by Meadow core and FoxHound:
	 *   { Scope, DefaultIdentifier, Schema[], DefaultObject, JsonSchema }
	 *
	 * @param {string} pTableName - Name of the table
	 * @param {Function} fCallback - callback(pError, pPackage)
	 */
	generateMeadowPackageFromTable(pTableName, fCallback)
	{
		this.introspectTableSchema(pTableName,
			(pError, pTableSchema) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				let tmpScope = pTableName;
				let tmpDefaultIdentifier = '';
				let tmpSchema = [];
				let tmpDefaultObject = {};

				for (let i = 0; i < pTableSchema.Columns.length; i++)
				{
					let tmpCol = pTableSchema.Columns[i];
					let tmpMeadowType = this._mapDataTypeToMeadowType(tmpCol.DataType, tmpCol.Column);

					if (tmpCol.DataType === 'ID')
					{
						tmpDefaultIdentifier = tmpCol.Column;
					}

					let tmpSchemaEntry = {
						Column: tmpCol.Column,
						Type: tmpMeadowType
					};

					if (tmpCol.Size)
					{
						tmpSchemaEntry.Size = tmpCol.Size;
					}

					tmpSchema.push(tmpSchemaEntry);
					tmpDefaultObject[tmpCol.Column] = this._getDefaultValue(tmpCol.DataType);
				}

				let tmpPackage = {
					Scope: tmpScope,
					DefaultIdentifier: tmpDefaultIdentifier,
					Schema: tmpSchema,
					DefaultObject: tmpDefaultObject
				};

				return fCallback(null, tmpPackage);
			});
	}
}

module.exports = MeadowSchemaSQLite;
