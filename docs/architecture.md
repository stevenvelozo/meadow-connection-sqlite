# Architecture & Design

Meadow Connection SQLite connects Fable applications to SQLite databases through the service provider pattern. This page illustrates the system architecture, connection lifecycle, query model, and how the provider fits into the Meadow ecosystem.

---

## System Architecture

```mermaid
graph TB
	App["Fable Application"]
	Settings["fable.settings.SQLite"]
	Provider["MeadowConnectionSQLite<br/>(Fable Service Provider)"]
	BetterSQLite["better-sqlite3<br/>(Native C++ Bindings)"]
	File["SQLite Database File<br/>or :memory:"]

	App -->|"reads config"| Settings
	App -->|"connectAsync()"| Provider
	Provider -->|"new Database(path)"| BetterSQLite
	BetterSQLite -->|"reads/writes"| File
	Provider -->|".db getter"| BetterSQLite
	Settings -->|"SQLiteFilePath"| Provider
```

---

## Connection Lifecycle

```mermaid
sequenceDiagram
	participant App as Application
	participant SM as ServiceManager
	participant Provider as MeadowConnectionSQLite
	participant BS3 as better-sqlite3
	participant File as Database File

	App->>SM: addServiceType('MeadowSQLiteProvider', lib)
	App->>SM: instantiateServiceProvider('MeadowSQLiteProvider')
	SM->>Provider: new MeadowConnectionSQLite(fable, manifest, hash)
	Note over Provider: connected = false

	App->>Provider: connectAsync(callback)

	alt SQLiteFilePath missing
		Provider-->>App: callback(error)
	else Already connected
		Provider-->>App: callback(null, existingDB)
	else Normal connect
		Provider->>BS3: new Database(filePath, options)
		BS3->>File: Open or create file
		File-->>BS3: File handle
		BS3-->>Provider: Database instance
		Provider->>BS3: pragma('journal_mode = WAL')
		Note over Provider: connected = true
		Provider-->>App: callback(null, database)
	end
```

---

## Synchronous Query Model

Unlike MySQL and MSSQL providers which use asynchronous APIs, the SQLite provider uses better-sqlite3's synchronous API. Every query blocks the event loop for the duration of the operation, but better-sqlite3's native C++ bindings make individual operations extremely fast.

```mermaid
flowchart LR
	subgraph "better-sqlite3 Synchronous API"
		EXEC["db.exec(sql)<br/>DDL / multi-statement"]
		PREP["db.prepare(sql)"]
		RUN["stmt.run(params)<br/>→ { changes, lastInsertRowid }"]
		GET["stmt.get(params)<br/>→ object | undefined"]
		ALL["stmt.all(params)<br/>→ array of objects"]
		TXN["db.transaction(fn)<br/>→ atomic wrapper"]
	end

	PREP --> RUN
	PREP --> GET
	PREP --> ALL

	style EXEC fill:#e8f4e8
	style RUN fill:#e8f0f8
	style GET fill:#e8f0f8
	style ALL fill:#e8f0f8
	style TXN fill:#f8f0e8
```

### Query Method Selection

| Goal | Method | Returns |
|------|--------|---------|
| Create tables, run DDL | `db.exec(sql)` | nothing |
| INSERT / UPDATE / DELETE | `db.prepare(sql).run(...)` | `{ changes, lastInsertRowid }` |
| SELECT one row | `db.prepare(sql).get(...)` | object or `undefined` |
| SELECT multiple rows | `db.prepare(sql).all(...)` | array of objects |
| Atomic batch operations | `db.transaction(fn)(args)` | return value of `fn` |

---

## Connection Settings Flow

```mermaid
flowchart TD
	FS["fable.settings.SQLite.SQLiteFilePath"]
	CO["Constructor Options.SQLiteFilePath"]
	Provider["MeadowConnectionSQLite"]
	Decision{{"Which source?"}}
	Use["Use resolved SQLiteFilePath"]

	FS --> Decision
	CO --> Decision
	Decision -->|"Options override Settings"| Use
	Use --> Provider
```

Settings priority:

1. **Constructor options** — passed as the second argument to `instantiateServiceProvider()`
2. **Fable settings** — `fable.settings.SQLite.SQLiteFilePath`

Constructor options take priority, allowing multiple provider instances with different database files.

---

## DDL Generation Flow

```mermaid
flowchart LR
	Schema["Meadow Table Schema<br/>{ TableName, Columns[] }"]
	Gen["generateCreateTableStatement()"]
	DDL["CREATE TABLE IF NOT EXISTS..."]
	Exec["db.exec(ddl)"]
	Table["SQLite Table"]

	Schema --> Gen
	Gen --> DDL
	DDL --> Exec
	Exec --> Table

	style Schema fill:#f0f0f0
	style DDL fill:#e8f4e8
	style Table fill:#e8f0f8
```

Each Meadow column type maps to a SQLite storage class:

| Meadow DataType | SQLite Column Definition |
|-----------------|--------------------------|
| `ID` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `GUID` | `TEXT DEFAULT '00000000-0000-0000-0000-000000000000'` |
| `ForeignKey` | `INTEGER NOT NULL DEFAULT 0` |
| `Numeric` | `INTEGER NOT NULL DEFAULT 0` |
| `Decimal` | `REAL` |
| `String` | `TEXT NOT NULL DEFAULT ''` |
| `Text` | `TEXT` |
| `DateTime` | `TEXT` |
| `Boolean` | `INTEGER NOT NULL DEFAULT 0` |

See [Schema & Table Creation](schema.md) for full details.

---

## Connection Safety

```mermaid
flowchart TD
	Start["connectAsync() called"]
	CheckPath{{"SQLiteFilePath<br/>configured?"}}
	CheckConn{{"Already<br/>connected?"}}
	Connect["Open database file"]
	WAL["Enable WAL journaling"]
	Done["callback(null, db)"]
	ErrPath["callback(error)"]
	ErrConn["Log error, callback(null, existingDB)"]

	Start --> CheckPath
	CheckPath -->|No| ErrPath
	CheckPath -->|Yes| CheckConn
	CheckConn -->|Yes| ErrConn
	CheckConn -->|No| Connect
	Connect --> WAL
	WAL --> Done

	style ErrPath fill:#f8e0e0
	style ErrConn fill:#f8f0e0
	style Done fill:#e0f8e0
```

The provider guards against:

- **Missing file path** -- Returns an error immediately if `SQLiteFilePath` is not configured
- **Double connect** -- Logs an error and returns the existing database if already connected
- **File creation** -- The database file is created automatically by better-sqlite3 if it does not exist

---

## Meadow Ecosystem Integration

```mermaid
sequenceDiagram
	participant App as Application
	participant Meadow as Meadow ORM
	participant FH as FoxHound
	participant Provider as SQLite Provider
	participant BS3 as better-sqlite3
	participant File as .db File

	App->>Provider: connectAsync()
	Provider->>BS3: new Database(path)
	BS3->>File: Open / create
	Provider-->>App: Connected

	App->>Meadow: new Meadow(fable, 'Entity')
	App->>Meadow: setProvider('ALASQL')
	App->>Meadow: setSchema(columns)

	Note over App,Provider: For schema DDL
	App->>Provider: createTable(schema)
	Provider->>Provider: generateCreateTableStatement()
	Provider->>BS3: db.exec(ddl)

	Note over App,Provider: For direct queries
	App->>Provider: .db getter
	Provider-->>App: Database instance
	App->>BS3: prepare(sql).all()
	BS3-->>App: Results
```

The SQLite connection provider serves two roles in the Meadow ecosystem:

1. **Schema DDL** -- Generates and executes `CREATE TABLE` statements from Meadow table schemas
2. **Direct query access** -- Exposes the `better-sqlite3` database for synchronous query execution

---

## Connector Comparison

| Feature | SQLite | MySQL | MSSQL | RocksDB |
|---------|--------|-------|-------|---------|
| **Server Required** | No | Yes | Yes | No |
| **Query API** | Synchronous | Async (callback) | Async (Promise) | Async (callback) |
| **File-based** | Yes | No | No | Yes |
| **In-memory mode** | `:memory:` | No | No | No |
| **WAL journaling** | Auto-enabled | N/A | N/A | Built-in |
| **Native driver** | better-sqlite3 | mysql2 | mssql (Tedious) | @nxtedition/rocksdb |
| **Connection pooling** | No (single file) | Yes | Yes | No (single handle) |
| **DDL generation** | Yes | Yes | Yes | No |
| **Prepared statements** | `db.prepare()` | Via pool | `ps.prepare()` | N/A |
| **Transactions** | `db.transaction(fn)` | Via pool | Via pool | Batch writes |
| **SQL support** | Full SQLite SQL | Full MySQL SQL | Full T-SQL | Key-value only |
| **Best for** | Local, embedded, test | Production servers | Enterprise | High-throughput KV |
