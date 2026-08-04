import * as duckdb from '@duckdb/duckdb-wasm';

let dbInstance: duckdb.AsyncDuckDB | null = null;
let dbConn: duckdb.AsyncDuckDBConnection | null = null;
let isInitializing = false;

export async function getDuckDB(): Promise<{ db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection }> {
  if (dbInstance && dbConn) {
    return { db: dbInstance, conn: dbConn };
  }

  if (isInitializing) {
    // Wait for ongoing initialization
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (dbInstance && dbConn) {
      return { db: dbInstance, conn: dbConn };
    }
  }

  isInitializing = true;
  try {
    // Get bundles via CDN for 100% reliable WASM worker loading in all web environments
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);

    const worker = await duckdb.createWorker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);

    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const conn = await db.connect();

    dbInstance = db;
    dbConn = conn;
    isInitializing = false;

    return { db, conn };
  } catch (error) {
    isInitializing = false;
    console.error('Failed to initialize DuckDB WASM:', error);
    throw error;
  }
}

/**
 * Register a user-uploaded file buffer with DuckDB WASM
 */
export async function registerDuckDBFile(filename: string, buffer: Uint8Array): Promise<string> {
  const { db } = await getDuckDB();
  await db.registerFileBuffer(filename, buffer);
  return filename;
}

/**
 * Execute a SQL query on the DuckDB WASM connection
 */
export async function executeDuckDBQuery(sql: string): Promise<{ columns: string[]; rows: Record<string, any>[] }> {
  const { conn } = await getDuckDB();
  let result;
  try {
    result = await conn.query(sql);
  } catch (err) {
    try {
      await conn.query('ROLLBACK;');
    } catch {
      // ignore
    }
    throw err;
  }

  const schema = result.schema;
  const columns = schema.fields.map((field) => field.name);

  // Convert Apache Arrow Table result to standard array of objects
  const rows: Record<string, any>[] = [];
  const numRows = result.numRows;

  for (let i = 0; i < numRows; i++) {
    const rowObj: Record<string, any> = {};
    for (const colName of columns) {
      const vector = result.getChild(colName);
      if (vector) {
        let val = vector.get(i);

        // Handle BigInt conversion
        if (typeof val === 'bigint') {
          val = Number(val);
        }

        // Handle Arrow Vector / TypedArray / Proxy / List objects
        if (val !== null && typeof val === 'object') {
          if (typeof val.toArray === 'function') {
            val = Array.from(val.toArray());
          } else if (Array.isArray(val)) {
            val = Array.from(val);
          } else if (val[Symbol.iterator] && typeof val !== 'string') {
            try {
              val = Array.from(val);
            } catch {
              // keep as is if not iterable
            }
          }
        }

        rowObj[colName] = val;

        // If val is a 4-element tire array or struct, add FL, FR, RL, RR convenience keys
        if (Array.isArray(val) && val.length === 4) {
          rowObj[`${colName}_FL`] = val[0];
          rowObj[`${colName}_FR`] = val[1];
          rowObj[`${colName}_RL`] = val[2];
          rowObj[`${colName}_RR`] = val[3];
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          if (val.FL !== undefined || val.fl !== undefined || val[0] !== undefined) {
            rowObj[`${colName}_FL`] = val.FL ?? val.fl ?? val[0];
            rowObj[`${colName}_FR`] = val.FR ?? val.fr ?? val[1];
            rowObj[`${colName}_RL`] = val.RL ?? val.rl ?? val[2];
            rowObj[`${colName}_RR`] = val.RR ?? val.rr ?? val[3];
          }
        }
      }
    }
    rows.push(rowObj);
  }

  return { columns, rows };
}

/**
 * Unregister a file from DuckDB WASM memory to prevent heap exhaustion
 */
export async function unregisterDuckDBFile(filename: string): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.dropFile(filename);
    } catch (e) {
      console.warn(`Failed to drop file ${filename} from DuckDB WASM memory:`, e);
    }
  }
}

/**
 * Drop a temporary table from DuckDB WASM session
 */
export async function dropTableIfExists(tableName: string): Promise<void> {
  if (dbConn) {
    try {
      await dbConn.query('ROLLBACK;');
    } catch {
      // ignore
    }
    try {
      await dbConn.query(`DROP TABLE IF EXISTS "${tableName}";`);
    } catch (e) {
      console.warn(`Failed to drop table ${tableName}:`, e);
    }
  }
}

/**
 * Ensures DuckDB WASM session is reset to default in-memory database context,
 * detaching any attached user databases to prevent catalog resolution errors.
 */
export async function resetDuckDBCatalogContext(): Promise<void> {
  const { conn } = await getDuckDB();

  // 1. Clear any aborted transaction
  try {
    await conn.query('ROLLBACK;');
  } catch {
    // ignore
  }

  // 2. Discover available databases and switch away from uploaded_db
  try {
    const dbsResult = await conn.query('SELECT database_name FROM duckdb_databases();');
    const dbs: string[] = [];
    for (let i = 0; i < dbsResult.numRows; i++) {
      const name = String(dbsResult.getChild('database_name')?.get(i) || '');
      if (name && name !== 'uploaded_db') {
        dbs.push(name);
      }
    }

    const candidates = ['memory', 'system', 'temp', 'main', ...dbs];
    for (const cand of candidates) {
      try {
        await conn.query(`USE "${cand}";`);
        break;
      } catch {
        try {
          await conn.query(`USE ${cand};`);
          break;
        } catch {
          // ignore
        }
      }
    }
  } catch {
    try { await conn.query('USE memory;'); } catch {}
    try { await conn.query('USE system;'); } catch {}
    try { await conn.query('USE main;'); } catch {}
  }

  // 3. Detach uploaded_db if attached previously
  try {
    await conn.query('DETACH DATABASE uploaded_db;');
  } catch {
    try {
      await conn.query('DETACH uploaded_db;');
    } catch {
      // ignore
    }
  }

  // 4. Re-affirm memory/main catalog context and search path
  const switchQueries = ['USE memory;', 'USE system;', 'USE main;'];
  for (const q of switchQueries) {
    try {
      await conn.query(q);
      break;
    } catch {
      // ignore
    }
  }

  try {
    await conn.query("SET search_path = 'main, memory.main, system.main';");
  } catch {
    // ignore
  }
}

/**
 * Reset DuckDB WASM session memory when switching large telemetry datasets
 */
export async function resetDuckDBSession(): Promise<void> {
  if (dbConn) {
    try {
      await dbConn.query('CHECKPOINT;');
    } catch (e) {
      // Ignored if in-memory
    }
  }
}

