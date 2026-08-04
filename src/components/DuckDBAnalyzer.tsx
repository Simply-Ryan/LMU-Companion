import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Upload,
  FileCode,
  Table as TableIcon,
  Play,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Layers,
  LineChart as LineChartIcon,
  Zap,
  Disc,
  Gauge,
  Sliders,
  ChevronRight,
  Info,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { getDuckDB, registerDuckDBFile, unregisterDuckDBFile, dropTableIfExists, resetDuckDBSession, resetDuckDBCatalogContext, executeDuckDBQuery } from '../lib/duckdb';
import { generateLMUSampleTelemetry, SAMPLE_PRESETS, SampleTelemetryPoint } from '../data/duckdbSamples';
import { TelemetryFrame, LapRecord, TrackInfo, CarInfo } from '../types';
import { rowToTelemetryFrame, parseRowsToLapRecords, parseRowsToTracePoints, extractTrackAndCarInfo } from '../lib/telemetryParser';

interface DuckDBAnalyzerProps {
  onLoadTelemetryToHUD?: (
    tableName: string,
    fileName: string,
    totalRows: number,
    laps: number[],
    lapRecords: LapRecord[],
    traceData: any[],
    track: TrackInfo,
    car: CarInfo
  ) => void;
}

interface LoadedTableInfo {
  tableName: string;
  rowCount: number;
  columns: { name: string; type: string }[];
}

export const DuckDBAnalyzer: React.FC<DuckDBAnalyzerProps> = ({ onLoadTelemetryToHUD }) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isDuckDBReady, setIsDuckDBReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // File states
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [activePresetId, setActivePresetId] = useState<string>('bahrain_ginetta_lmp3');

  // Database metadata
  const [tables, setTables] = useState<LoadedTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('lmu_telemetry');

  // SQL Query State
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT lap_number, track_distance_m, speed_kmh, throttle_pct, brake_pct, gear, rpm, virtual_energy_mj, mgu_soc_pct FROM lmu_telemetry ORDER BY sample_id LIMIT 300;'
  );
  const [queryResults, setQueryResults] = useState<{ columns: string[]; rows: Record<string, any>[] } | null>(null);
  const [queryExecutionTimeMs, setQueryExecutionTimeMs] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState<boolean>(false);

  // Visualizer / Chart States
  const [chartData, setChartData] = useState<Record<string, any>[]>([]);
  const [selectedLap, setSelectedLap] = useState<number>(1);
  const [availableLaps, setAvailableLaps] = useState<number[]>([1, 2, 3]);

  // Dynamic Column Mapping for Custom DuckDB Files
  const [speedCol, setSpeedCol] = useState<string>('speed_kmh');
  const [rpmCol, setRpmCol] = useState<string>('rpm');
  const [throttleCol, setThrottleCol] = useState<string>('throttle_pct');
  const [brakeCol, setBrakeCol] = useState<string>('brake_pct');
  const [energyCol, setEnergyCol] = useState<string>('virtual_energy_mj');
  const [lapCol, setLapCol] = useState<string>('lap_number');
  const [selectedXAxis, setSelectedXAxis] = useState<string>('track_distance_m');

  // Auto-detect telemetry channels from column names
  const autoDetectColumns = (colList: string[]) => {
    if (!colList || colList.length === 0) return;

    const findCol = (patterns: RegExp[], fallbacks: string[]) => {
      for (const pat of patterns) {
        const found = colList.find((c) => pat.test(c));
        if (found) return found;
      }
      for (const fb of fallbacks) {
        const exact = colList.find((c) => c.toLowerCase() === fb.toLowerCase());
        if (exact) return exact;
      }
      return colList[0] || '';
    };

    const spd = findCol([/gps speed/i, /ground speed/i, /wheel speed/i, /speed/i, /vcar/i, /velocity/i, /kmh/i, /mph/i], ['speed_kmh', 'speed']);
    const rpm = findCol([/engine rpm/i, /^rpm$/i, /rpm/i, /engine/i], ['rpm']);
    const thr = findCol([/throttle pos/i, /throttle/i, /gas/i, /pedal/i], ['throttle_pct', 'throttle']);
    const brk = findCol([/brake pos/i, /brake/i], ['brake_pct', 'brake']);
    const nrg = findCol([/virtual energy/i, /fuel level/i, /energy/i, /fuel/i, /mj/i], ['virtual_energy_mj', 'fuel']);
    const lap = findCol([/^lap$/i, /lap_number/i, /lap/i, /nlap/i], ['lap_number', 'lap']);
    const xAxis = findCol([/lap dist/i, /total dist/i, /track_distance/i, /distance/i, /dist/i, /gps time/i, /laptime/i, /timestamp/i, /sample_id/i], ['track_distance_m', 'distance']);

    setSpeedCol(spd);
    setRpmCol(rpm);
    setThrottleCol(thr);
    setBrakeCol(brk);
    setEnergyCol(nrg);
    setLapCol(lap);
    setSelectedXAxis(xAxis);
  };

  // Telemetry channels toggle for chart
  const [showSpeed, setShowSpeed] = useState<boolean>(true);
  const [showThrottleBrake, setShowThrottleBrake] = useState<boolean>(true);
  const [showVirtualEnergy, setShowVirtualEnergy] = useState<boolean>(true);
  const [showTireTemps, setShowTireTemps] = useState<boolean>(false);
  const [showGForces, setShowGForces] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize DuckDB WASM on mount
  useEffect(() => {
    async function init() {
      setIsInitializing(true);
      setDbError(null);
      try {
        await getDuckDB();
        setIsDuckDBReady(true);
        // Automatically load default preset
        await loadPresetDataset('bahrain_ginetta_lmp3');
      } catch (err: any) {
        console.error('DuckDB Init Error:', err);
        setDbError(err.message || 'Failed to initialize DuckDB WASM in browser');
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // Helper to resolve active table name safely
  const getActiveTableName = () => {
    if (selectedTable && tables.some((t) => t.tableName === selectedTable)) {
      return selectedTable;
    }
    if (tables.length > 0 && tables[0].tableName) {
      return tables[0].tableName;
    }
    return 'lmu_telemetry';
  };

  // Helper to register & inspect DuckDB data table
  const inspectAndRefreshTables = async () => {
    try {
      await resetDuckDBCatalogContext();
      // Fetch table list
      const tablesResult = await executeDuckDBQuery("SHOW TABLES;");
      const tableNames = tablesResult.rows
        .map((r) => String(r.name || r.table_name || Object.values(r)[0]))
        .filter(Boolean)
        .filter(
          (n) =>
            !n.startsWith('pg_') &&
            !n.startsWith('sqlite_') &&
            !n.startsWith('duckdb_') &&
            !n.startsWith('information_schema')
        );

      const loadedTables: LoadedTableInfo[] = [];

      for (const name of tableNames) {
        if (!name) continue;
        try {
          const countResult = await executeDuckDBQuery(`SELECT COUNT(*) as cnt FROM "${name}";`);
          const rowCount = countResult.rows[0]?.cnt || 0;

          const schemaResult = await executeDuckDBQuery(`DESCRIBE "${name}";`);
          const columns = schemaResult.rows.map((c) => ({
            name: String(c.column_name || c.Field || Object.values(c)[0]),
            type: String(c.column_type || c.Type || Object.values(c)[1] || 'VARCHAR'),
          }));

          loadedTables.push({
            tableName: String(name),
            rowCount: Number(rowCount),
            columns,
          });
        } catch (tableErr) {
          console.warn(`Could not inspect table ${name}:`, tableErr);
        }
      }

      setTables(loadedTables);
      if (loadedTables.length > 0) {
        const defaultTbl =
          selectedTable && loadedTables.some((t) => t.tableName === selectedTable)
            ? selectedTable
            : loadedTables.find((t) => t.tableName === 'lmu_telemetry')?.tableName || loadedTables[0].tableName;
        setSelectedTable(defaultTbl);
        await runAnalysisForTable(defaultTbl);
      } else {
        setSelectedTable('');
        setChartData([]);
      }
    } catch (err: any) {
      console.error('Error inspecting DuckDB tables:', err);
      setQueryError('Failed to inspect database tables: ' + err.message);
    }
  };

  // Helper to sync telemetry rows across all app views
  const syncFullTelemetryToApp = async (tableName: string) => {
    if (!tableName || !onLoadTelemetryToHUD) return;
    try {
      const cntRes = await executeDuckDBQuery(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
      const totalCount = Number(cntRes.rows[0]?.cnt || 0);
      const step = totalCount > 10000 ? Math.ceil(totalCount / 10000) : 1;

      // Pull downsampled data for charts
      const traceRes = await executeDuckDBQuery(
        `SELECT * FROM "${tableName}" WHERE (sample_id % ${step}) = 0 ORDER BY sample_id;`
      );
      
      // Pull all data to compute lap records (will be garbage collected after parse)
      const fullRes = await executeDuckDBQuery(`SELECT * FROM "${tableName}" ORDER BY sample_id;`);
      
      // Try to read metadata if it exists
      let metaCarName = undefined;
      let metaTrackName = undefined;
      try {
        const metaRes = await executeDuckDBQuery(`SELECT * FROM uploaded_db.main.metadata`);
        if (metaRes.rows && metaRes.rows.length > 0) {
          const carRow = metaRes.rows.find(r => r.key === 'VehicleName' || r.key === 'Vehicle' || r.key === 'Car');
          const trackRow = metaRes.rows.find(r => r.key === 'TrackName' || r.key === 'Track' || r.key === 'Circuit');
          if (carRow) metaCarName = carRow.value;
          if (trackRow) metaTrackName = trackRow.value;
        }
      } catch (err) {
        // metadata table might not exist
      }

      if (fullRes.rows && fullRes.rows.length > 0) {
        const { track, car } = extractTrackAndCarInfo(fullRes.rows, metaCarName, metaTrackName);
        const lapRecords = parseRowsToLapRecords(fullRes.rows);
        const traceData = parseRowsToTracePoints(traceRes.rows);
        const laps = Array.from(new Set(fullRes.rows.map((r: any) => r.lap_number || r.Lap || r.lap || 1))).map(Number).sort((a, b) => a - b);
        
        onLoadTelemetryToHUD(
          tableName,
          currentFileName || tableName,
          totalCount,
          laps,
          lapRecords,
          traceData,
          track,
          car
        );
      }
    } catch (err) {
      console.warn('Failed syncing telemetry to App:', err);
    }
  };

  // Helper to run default analysis queries
  const runAnalysisForTable = async (tableName: string) => {
    if (!tableName) return;
    try {
      const defaultSql = `SELECT * FROM "${tableName}" LIMIT 300;`;
      setSqlQuery(defaultSql);
      await handleExecuteQuery(defaultSql);

      // Check available columns
      const schemaResult = await executeDuckDBQuery(`DESCRIBE "${tableName}";`);
      const colsOriginal = schemaResult.rows.map((c) =>
        String(c.column_name || c.Field || Object.values(c)[0])
      );
      const cols = colsOriginal.map((c) => c.toLowerCase());

      autoDetectColumns(colsOriginal);

      const lapColIdx = cols.findIndex((c) => c === 'lap_number' || c === 'lap' || c === 'nlap' || c === 'lap number' || c === 'current lap');
      if (lapColIdx !== -1) {
        const lapColName = colsOriginal[lapColIdx];
        const lapsResult = await executeDuckDBQuery(`SELECT DISTINCT "${lapColName}" FROM "${tableName}" WHERE "${lapColName}" IS NOT NULL ORDER BY "${lapColName}";`);
        if (lapsResult.rows.length > 0) {
          const laps = lapsResult.rows.map((r) => Number(r[lapColName])).filter((l) => !isNaN(l));
          setAvailableLaps(laps);
          if (laps.length > 0) {
            setSelectedLap(laps[0]);
            await fetchTelemetryForLap(tableName, laps[0], colsOriginal);
          } else {
            setAvailableLaps([]);
            await fetchTelemetryForLap(tableName, 0, colsOriginal);
          }
        } else {
          setAvailableLaps([]);
          await fetchTelemetryForLap(tableName, 0, colsOriginal);
        }
      } else {
        setAvailableLaps([]);
        const res = await executeDuckDBQuery(`SELECT * FROM "${tableName}" LIMIT 500;`);
        setChartData(res.rows);
      }

      // Sync all telemetry views with uploaded table
      await syncFullTelemetryToApp(tableName);
    } catch (e) {
      console.error('Error running analysis for table:', e);
    }
  };

  // Fetch telemetry traces for a specific lap
  const fetchTelemetryForLap = async (tableName: string, lap: number, existingCols?: string[]) => {
    if (!tableName) return;
    try {
      let colsOriginal = existingCols;
      if (!colsOriginal) {
        const schemaResult = await executeDuckDBQuery(`DESCRIBE "${tableName}";`);
        colsOriginal = schemaResult.rows.map((c) =>
          String(c.column_name || c.Field || Object.values(c)[0])
        );
      }
      const cols = colsOriginal.map((c) => c.toLowerCase());

      let sql = `SELECT * FROM "${tableName}"`;
      const conditions: string[] = [];

      const lapColIndex = cols.findIndex((c) => c === 'lap_number' || c === 'lap' || c === 'nlap' || c === 'lap number' || c === 'current lap');
      if (lapColIndex !== -1 && lap !== undefined && lap !== null) {
        const actualLapCol = colsOriginal[lapColIndex];
        conditions.push(`"${actualLapCol}" = ${lap}`);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      const distCol = colsOriginal.find((c) => /lap dist|total dist|track_distance|distance|dist/i.test(c));
      const timeCol = colsOriginal.find((c) => /gps time|timestamp|time/i.test(c));
      const sampleCol = colsOriginal.find((c) => /sample_id|index|id/i.test(c));

      if (distCol) {
        sql += ` ORDER BY "${distCol}" ASC`;
      } else if (timeCol) {
        sql += ` ORDER BY "${timeCol}" ASC`;
      } else if (sampleCol) {
        sql += ` ORDER BY "${sampleCol}" ASC`;
      }

      const res = await executeDuckDBQuery(sql);
      setChartData(res.rows);
    } catch (e) {
      console.error('Error fetching lap chart data:', e);
      setChartData([]);
    }
  };

  // Handle user file upload (.duckdb, .db, .sqlite, .parquet, .csv, .json)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsInitializing(true);
    setDbError(null);
    setQueryError(null);

    // Perform explicit memory cleanup of previous session and tables
    try {
      if (currentFileName) {
        await unregisterDuckDBFile(currentFileName.replace(/[^a-zA-Z0-9_.-]/g, '_'));
      }
      await resetDuckDBCatalogContext();
      await dropTableIfExists('lmu_telemetry');
      await dropTableIfExists('lap_summary');
      await resetDuckDBSession();
    } catch (e) {
      console.warn('Memory cleanup warning prior to upload:', e);
    }

    setCurrentFileName(file.name);
    setFileSizeBytes(file.size);
    setActivePresetId('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      try {
        await unregisterDuckDBFile(sanitizedName);
      } catch (e) {
        // Ignore if not registered
      }
      await registerDuckDBFile(sanitizedName, uint8);

      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'parquet') {
        await executeDuckDBQuery(`CREATE OR REPLACE TABLE lmu_telemetry AS SELECT * FROM read_parquet('${sanitizedName}');`);
      } else if (ext === 'csv') {
        await executeDuckDBQuery(`CREATE OR REPLACE TABLE lmu_telemetry AS SELECT * FROM read_csv_auto('${sanitizedName}');`);
      } else if (ext === 'json') {
        await executeDuckDBQuery(`CREATE OR REPLACE TABLE lmu_telemetry AS SELECT * FROM read_json_auto('${sanitizedName}');`);
      } else {
        // Reset catalog context before attaching user database
        await resetDuckDBCatalogContext();

        // Attach user database file as uploaded_db
        await executeDuckDBQuery(`ATTACH '${sanitizedName}' AS uploaded_db;`);
        await processAttachedDuckDBFile();
      }

      await inspectAndRefreshTables();
    } catch (err: any) {
      console.error('Failed to parse uploaded DuckDB file:', err);
      setDbError(`Error processing ${file.name}: ${err.message || 'Invalid DuckDB format'}`);
    } finally {
      setIsInitializing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Process attached DuckDB database file (handles single-table and multi-channel telemetry schemas)
  const processAttachedDuckDBFile = async () => {
    let attachedTables: string[] = [];
    try {
      const res = await executeDuckDBQuery(
        "SELECT table_name FROM information_schema.tables WHERE table_catalog = 'uploaded_db' OR table_schema = 'uploaded_db';"
      );
      attachedTables = res.rows.map((r) => String(r.table_name)).filter(Boolean);
    } catch {
      // fallback
    }

    if (attachedTables.length === 0) {
      try {
        const res = await executeDuckDBQuery(
          "SELECT table_name FROM duckdb_tables() WHERE database_name = 'uploaded_db' OR catalog_name = 'uploaded_db';"
        );
        attachedTables = res.rows.map((r) => String(r.table_name || r.name)).filter(Boolean);
      } catch {
        // fallback
      }
    }

    if (attachedTables.length === 0) {
      try {
        const res = await executeDuckDBQuery("SHOW TABLES FROM uploaded_db;");
        attachedTables = res.rows
          .map((r) => String(r.name || r.table_name || Object.values(r)[0]))
          .filter(Boolean);
      } catch {
        // fallback
      }
    }

    const userTables = attachedTables.filter(
      (t) =>
        !t.startsWith('pg_') &&
        !t.startsWith('sqlite_') &&
        !t.startsWith('duckdb_') &&
        !t.startsWith('information_schema')
    );

    const tablesToCopy = userTables.length > 0 ? userTables : attachedTables;

    if (tablesToCopy.length === 0) {
      throw new Error('No readable user tables found in the uploaded DuckDB database file.');
    }

    // Check if lmu_telemetry exists directly
    if (!tablesToCopy.includes('lmu_telemetry')) {
      const baseTable = tablesToCopy.find(t =>
        ['Ground Speed', 'Speed', 'GPS Speed', 'Engine RPM', 'RPM'].some(p => t.toLowerCase() === p.toLowerCase())
      ) || tablesToCopy[0];

      let isMultiChannel = false;
      try {
        const baseSchema = await executeDuckDBQuery(`DESCRIBE uploaded_db.main."${baseTable}";`);
        const cols = baseSchema.rows.map(c => String(c.column_name || c.Field || Object.values(c)[0]).toLowerCase());
        if (cols.includes('value') || cols.includes('value1') || tablesToCopy.includes('Throttle Pos') || tablesToCopy.includes('Ground Speed')) {
          isMultiChannel = true;
        }
      } catch {}

      if (isMultiChannel && baseTable) {
        try {
          const hasTable = (tblName: string) => tablesToCopy.some(t => t.toLowerCase() === tblName.toLowerCase());

          // Find start timestamp
          let startTs = 0;
          if (hasTable('Lap')) {
            try {
              const tsRes = await executeDuckDBQuery(`SELECT MIN(ts) as min_ts FROM uploaded_db.main."Lap";`);
              startTs = Number(tsRes.rows[0]?.min_ts || 0);
            } catch {}
          } else if (hasTable('Gear')) {
            try {
              const tsRes = await executeDuckDBQuery(`SELECT MIN(ts) as min_ts FROM uploaded_db.main."Gear";`);
              startTs = Number(tsRes.rows[0]?.min_ts || 0);
            } catch {}
          }

          const cntRes = await executeDuckDBQuery(`SELECT COUNT(*) as cnt FROM uploaded_db.main."${baseTable}";`);
          const baseCount = Number(cntRes.rows[0]?.cnt || 1);

          // Get counts for each channel table safely
          const getTableCount = async (tblName: string) => {
            if (!hasTable(tblName)) return 1;
            try {
              const r = await executeDuckDBQuery(`SELECT COUNT(*) as cnt FROM uploaded_db.main."${tblName}";`);
              return Number(r.rows[0]?.cnt || 1);
            } catch {
              return 1;
            }
          };

          const throttleCnt = await getTableCount('Throttle Pos');
          const brakeCnt = await getTableCount('Brake Pos');
          const rpmCnt = await getTableCount('Engine RPM');
          const steeringCnt = await getTableCount('Steering Pos');
          const lapDistCnt = await getTableCount('Lap Dist');
          const fuelCnt = await getTableCount('Fuel Level');
          const gLatCnt = await getTableCount('G Force Lat');
          const gLongCnt = await getTableCount('G Force Long');
          const gpsLatCnt = await getTableCount('GPS Latitude');
          const gpsLongCnt = await getTableCount('GPS Longitude');
          const ambTempCnt = hasTable('Ambient Temperature') ? await getTableCount('Ambient Temperature') : await getTableCount('Ambient Temp');
          const trackTempCnt = hasTable('Track Temperature') ? await getTableCount('Track Temperature') : await getTableCount('Track Temp');
          const rainCnt = hasTable('Minimum Path Wetness') ? await getTableCount('Minimum Path Wetness') : await getTableCount('Rain Intensity');
          const speedCnt = hasTable('Ground Speed') ? await getTableCount('Ground Speed') : await getTableCount('GPS Speed');

          const rpmSql = hasTable('Engine RPM') ? `SELECT row_number() OVER () - 1 AS idx, value AS engine_rpm FROM uploaded_db.main."Engine RPM"` : `SELECT 0 AS idx, 0 AS engine_rpm WHERE 1=0`;
          const steeringSql = hasTable('Steering Pos') ? `SELECT row_number() OVER () - 1 AS idx, value AS steering_pct FROM uploaded_db.main."Steering Pos"` : `SELECT 0 AS idx, 0 AS steering_pct WHERE 1=0`;
          const throttleSql = hasTable('Throttle Pos') ? `SELECT row_number() OVER () - 1 AS idx, value AS throttle_pct FROM uploaded_db.main."Throttle Pos"` : `SELECT 0 AS idx, 0 AS throttle_pct WHERE 1=0`;
          const brakeSql = hasTable('Brake Pos') ? `SELECT row_number() OVER () - 1 AS idx, value AS brake_pct FROM uploaded_db.main."Brake Pos"` : `SELECT 0 AS idx, 0 AS brake_pct WHERE 1=0`;
          const lapDistSql = hasTable('Lap Dist') ? `SELECT row_number() OVER () - 1 AS idx, value AS track_distance_m FROM uploaded_db.main."Lap Dist"` : `SELECT 0 AS idx, 0 AS track_distance_m WHERE 1=0`;
          const fuelSql = hasTable('Fuel Level') ? `SELECT row_number() OVER () - 1 AS idx, value AS fuel_remaining_l FROM uploaded_db.main."Fuel Level"` : `SELECT 0 AS idx, 0 AS fuel_remaining_l WHERE 1=0`;
          const gLatSql = hasTable('G Force Lat') ? `SELECT row_number() OVER () - 1 AS idx, value AS lat_accel_g FROM uploaded_db.main."G Force Lat"` : `SELECT 0 AS idx, 0 AS lat_accel_g WHERE 1=0`;
          const gLongSql = hasTable('G Force Long') ? `SELECT row_number() OVER () - 1 AS idx, value AS long_accel_g FROM uploaded_db.main."G Force Long"` : `SELECT 0 AS idx, 0 AS long_accel_g WHERE 1=0`;
          const gpsLatSql = hasTable('GPS Latitude') ? `SELECT row_number() OVER () - 1 AS idx, value AS pos_z FROM uploaded_db.main."GPS Latitude"` : `SELECT 0 AS idx, NULL AS pos_z WHERE 1=0`;
          const gpsLongSql = hasTable('GPS Longitude') ? `SELECT row_number() OVER () - 1 AS idx, value AS pos_x FROM uploaded_db.main."GPS Longitude"` : `SELECT 0 AS idx, NULL AS pos_x WHERE 1=0`;
          
          let ambTempSql = `SELECT 0 AS idx, 22.5 AS ambient_temp_c WHERE 1=0`;
          if (hasTable('Ambient Temperature')) ambTempSql = `SELECT row_number() OVER () - 1 AS idx, value AS ambient_temp_c FROM uploaded_db.main."Ambient Temperature"`;
          else if (hasTable('Ambient Temp')) ambTempSql = `SELECT row_number() OVER () - 1 AS idx, value AS ambient_temp_c FROM uploaded_db.main."Ambient Temp"`;

          let trackTempSql = `SELECT 0 AS idx, 31.0 AS track_temp_c WHERE 1=0`;
          if (hasTable('Track Temperature')) trackTempSql = `SELECT row_number() OVER () - 1 AS idx, value AS track_temp_c FROM uploaded_db.main."Track Temperature"`;
          else if (hasTable('Track Temp')) trackTempSql = `SELECT row_number() OVER () - 1 AS idx, value AS track_temp_c FROM uploaded_db.main."Track Temp"`;
          
          let rainSql = `SELECT 0 AS idx, 0 AS rain_intensity WHERE 1=0`;
          if (hasTable('Minimum Path Wetness')) rainSql = `SELECT row_number() OVER () - 1 AS idx, value AS rain_intensity FROM uploaded_db.main."Minimum Path Wetness"`;
          else if (hasTable('Rain Intensity')) rainSql = `SELECT row_number() OVER () - 1 AS idx, value AS rain_intensity FROM uploaded_db.main."Rain Intensity"`;
          
          let speedSql = `SELECT 0 AS idx, 0 AS speed_kmh WHERE 1=0`;
          if (hasTable('Ground Speed')) speedSql = `SELECT row_number() OVER () - 1 AS idx, value * 3.6 AS speed_kmh FROM uploaded_db.main."Ground Speed"`;
          else if (hasTable('GPS Speed')) speedSql = `SELECT row_number() OVER () - 1 AS idx, value * 3.6 AS speed_kmh FROM uploaded_db.main."GPS Speed"`;
          
          const gearSql = hasTable('Gear') ? `SELECT ts, value AS gear FROM uploaded_db.main."Gear"` : `SELECT 0 AS ts, 0 AS gear WHERE 1=0`;
          const lapSql = hasTable('Lap') ? `SELECT ts, value AS lap_number FROM uploaded_db.main."Lap"` : `SELECT 0 AS ts, 1 AS lap_number WHERE 1=0`;

          const fullSql = `
            CREATE OR REPLACE TABLE lmu_telemetry AS
            WITH base AS (
              SELECT
                row_number() OVER () - 1 AS idx,
                ${startTs} + (row_number() OVER () - 1) * 0.01 AS ts,
                (row_number() OVER () - 1) * 0.01 AS current_lap_time_seconds,
                COALESCE(value, 0) AS base_value
              FROM uploaded_db.main."${baseTable}"
            ),
            rpm_t AS (${rpmSql}),
            speed_t AS (${speedSql}),
            steering_t AS (${steeringSql}),
            throttle_t AS (${throttleSql}),
            brake_t AS (${brakeSql}),
            lap_dist_t AS (${lapDistSql}),
            fuel_t AS (${fuelSql}),
            g_lat_t AS (${gLatSql}),
            g_long_t AS (${gLongSql}),
            gps_lat_t AS (${gpsLatSql}),
            gps_long_t AS (${gpsLongSql}),
            amb_t AS (${ambTempSql}),
            track_t AS (${trackTempSql}),
            rain_t AS (${rainSql}),
            gear_asof AS (${gearSql}),
            lap_asof AS (${lapSql})
            SELECT
              b.idx + 1 AS sample_id,
              b.idx + 1 AS id,
              ROUND(b.ts, 3) AS timestamp_s,
              ROUND(b.current_lap_time_seconds, 3) AS current_lap_time_seconds,
              ROUND(COALESCE(speed_t.speed_kmh, b.base_value * 3.6), 2) AS speed_kmh,
              ROUND(COALESCE(rpm_t.engine_rpm, 0), 0) AS engine_rpm,
              ROUND(COALESCE(steering_t.steering_pct, 0), 2) AS steering_pct,
              ROUND(COALESCE(throttle_t.throttle_pct, 0), 1) AS throttle_pct,
              ROUND(COALESCE(brake_t.brake_pct, 0), 1) AS brake_pct,
              ROUND(COALESCE(lap_dist_t.track_distance_m, 0), 2) AS track_distance_m,
              ROUND(COALESCE(fuel_t.fuel_remaining_l, 0), 2) AS fuel_remaining_l,
              ROUND(COALESCE(g_lat_t.lat_accel_g, 0), 3) AS lat_accel_g,
              ROUND(COALESCE(g_long_t.long_accel_g, 0), 3) AS long_accel_g,
              ROUND(COALESCE(amb_t.ambient_temp_c, 22.5), 1) AS ambient_temp_c,
              ROUND(COALESCE(track_t.track_temp_c, 31.0), 1) AS track_temp_c,
              ROUND(COALESCE(rain_t.rain_intensity, 0), 2) AS rain_intensity,
              gps_lat_t.pos_z AS pos_z,
              gps_long_t.pos_x AS pos_x,
              COALESCE(g.gear, 0) AS gear,
              COALESCE(l.lap_number, 1) AS lap_number
            FROM base b
            LEFT JOIN rpm_t ON CAST(FLOOR(b.idx * ${rpmCnt} / ${baseCount}) AS BIGINT) = rpm_t.idx
            LEFT JOIN speed_t ON CAST(FLOOR(b.idx * ${speedCnt} / ${baseCount}) AS BIGINT) = speed_t.idx
            LEFT JOIN steering_t ON CAST(FLOOR(b.idx * ${steeringCnt} / ${baseCount}) AS BIGINT) = steering_t.idx
            LEFT JOIN throttle_t ON CAST(FLOOR(b.idx * ${throttleCnt} / ${baseCount}) AS BIGINT) = throttle_t.idx
            LEFT JOIN brake_t ON CAST(FLOOR(b.idx * ${brakeCnt} / ${baseCount}) AS BIGINT) = brake_t.idx
            LEFT JOIN lap_dist_t ON CAST(FLOOR(b.idx * ${lapDistCnt} / ${baseCount}) AS BIGINT) = lap_dist_t.idx
            LEFT JOIN fuel_t ON CAST(FLOOR(b.idx * ${fuelCnt} / ${baseCount}) AS BIGINT) = fuel_t.idx
            LEFT JOIN g_lat_t ON CAST(FLOOR(b.idx * ${gLatCnt} / ${baseCount}) AS BIGINT) = g_lat_t.idx
            LEFT JOIN g_long_t ON CAST(FLOOR(b.idx * ${gLongCnt} / ${baseCount}) AS BIGINT) = g_long_t.idx
            LEFT JOIN gps_lat_t ON CAST(FLOOR(b.idx * ${gpsLatCnt} / ${baseCount}) AS BIGINT) = gps_lat_t.idx
            LEFT JOIN gps_long_t ON CAST(FLOOR(b.idx * ${gpsLongCnt} / ${baseCount}) AS BIGINT) = gps_long_t.idx
            LEFT JOIN amb_t ON CAST(FLOOR(b.idx * ${ambTempCnt} / ${baseCount}) AS BIGINT) = amb_t.idx
            LEFT JOIN track_t ON CAST(FLOOR(b.idx * ${trackTempCnt} / ${baseCount}) AS BIGINT) = track_t.idx
            LEFT JOIN rain_t ON CAST(FLOOR(b.idx * ${rainCnt} / ${baseCount}) AS BIGINT) = rain_t.idx
            ASOF LEFT JOIN gear_asof g ON b.ts >= g.ts
            ASOF LEFT JOIN lap_asof l ON b.ts >= l.ts;
          `;

          await executeDuckDBQuery(fullSql);
        } catch (err) {
          console.warn('Multi-channel DuckDB parsing failed, falling back to alias:', err);
          await executeDuckDBQuery(`CREATE OR REPLACE TABLE lmu_telemetry AS SELECT * FROM uploaded_db.main."${tablesToCopy[0]}";`);
        }
      } else {
        await executeDuckDBQuery(`CREATE OR REPLACE TABLE lmu_telemetry AS SELECT * FROM uploaded_db.main."${tablesToCopy[0]}";`);
      }
    }

    // Create lap_summary table
    try {
      await executeDuckDBQuery(`
        CREATE OR REPLACE TABLE lap_summary AS
        SELECT
          COALESCE(lap_number, 1) as lap_number,
          COUNT(*) as samples_count,
          ROUND(MAX(speed_kmh), 1) as top_speed_kmh,
          ROUND(AVG(speed_kmh), 1) as avg_speed_kmh,
          ROUND(MAX(throttle_pct), 1) as max_throttle,
          ROUND(MAX(brake_pct), 1) as max_brake,
          ROUND(MAX(lat_accel_g), 2) as max_lat_g
        FROM lmu_telemetry
        GROUP BY 1
        ORDER BY 1;
      `);
    } catch {
      try {
        await executeDuckDBQuery(`
          CREATE OR REPLACE TABLE lap_summary AS
          SELECT
            1 as lap_number,
            COUNT(*) as samples_count
          FROM lmu_telemetry;
        `);
      } catch {}
    }
  };

  // Load Sample Preset Dataset
  const loadPresetDataset = async (presetId: string) => {
    setIsInitializing(true);
    setDbError(null);
    setQueryError(null);
    setActivePresetId(presetId);

    // Perform explicit memory cleanup of previous tables and DuckDB session
    try {
      if (currentFileName) {
        await unregisterDuckDBFile(currentFileName.replace(/[^a-zA-Z0-9_.-]/g, '_'));
      }
      await resetDuckDBCatalogContext();
      await dropTableIfExists('lmu_telemetry');
      await dropTableIfExists('lap_summary');
      await resetDuckDBSession();
    } catch (e) {
      console.warn('Memory cleanup warning prior to loading preset:', e);
    }

    const preset = (SAMPLE_PRESETS as any[]).find((p) => p.id === presetId) || SAMPLE_PRESETS[0];
    setCurrentFileName(preset.filename);
    setFileSizeBytes(preset.isRealFile ? 9140000 : 4850000);

    try {
      if (preset.isRealFile && preset.fileUrl) {
        const response = await fetch(preset.fileUrl);
        if (!response.ok) throw new Error(`Failed to load preset file: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const sanitizedName = preset.filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        await registerDuckDBFile(sanitizedName, uint8);

        await resetDuckDBCatalogContext();
        await executeDuckDBQuery(`ATTACH '${sanitizedName}' AS uploaded_db;`);
        await processAttachedDuckDBFile();
        await inspectAndRefreshTables();
        return;
      }

      const points = generateLMUSampleTelemetry(preset.car, preset.track, preset.laps);

      // Reset catalog context to memory.main and detach uploaded_db
      await resetDuckDBCatalogContext();

      // Create main DuckDB table atomically with CREATE OR REPLACE TABLE
      await executeDuckDBQuery(`
        CREATE OR REPLACE TABLE lmu_telemetry (
          sample_id INTEGER,
          timestamp_ms BIGINT,
          lap_number INTEGER,
          sector_number INTEGER,
          track_distance_m DOUBLE,
          speed_kmh DOUBLE,
          rpm INTEGER,
          gear INTEGER,
          throttle_pct DOUBLE,
          brake_pct DOUBLE,
          steering_angle_deg DOUBLE,
          fuel_remaining_l DOUBLE,
          virtual_energy_mj DOUBLE,
          mgu_soc_pct DOUBLE,
          tire_temp_fl_c DOUBLE,
          tire_temp_fr_c DOUBLE,
          tire_temp_rl_c DOUBLE,
          tire_temp_rr_c DOUBLE,
          tire_wear_fl_pct DOUBLE,
          tire_wear_fr_pct DOUBLE,
          tire_wear_rl_pct DOUBLE,
          tire_wear_rr_pct DOUBLE,
          lat_accel_g DOUBLE,
          long_accel_g DOUBLE
        );
      `);

      // Insert data points into DuckDB WASM in batch chunks
      const chunkSize = 100;
      for (let i = 0; i < points.length; i += chunkSize) {
        const chunk = points.slice(i, i + chunkSize);
        const valuesSql = chunk
          .map(
            (p) =>
              `(${p.sample_id}, ${p.timestamp_ms}, ${p.lap_number}, ${p.sector_number}, ${p.track_distance_m}, ${p.speed_kmh}, ${p.rpm}, ${p.gear}, ${p.throttle_pct}, ${p.brake_pct}, ${p.steering_angle_deg}, ${p.fuel_remaining_l}, ${p.virtual_energy_mj}, ${p.mgu_soc_pct}, ${p.tire_temp_fl_c}, ${p.tire_temp_fr_c}, ${p.tire_temp_rl_c}, ${p.tire_temp_rr_c}, ${p.tire_wear_fl_pct}, ${p.tire_wear_fr_pct}, ${p.tire_wear_rl_pct}, ${p.tire_wear_rr_pct}, ${p.lat_accel_g}, ${p.long_accel_g})`
          )
          .join(',');

        await executeDuckDBQuery(`INSERT INTO lmu_telemetry VALUES ${valuesSql};`);
      }

      // Create auxiliary summary table in DuckDB atomically
      await executeDuckDBQuery(`
        CREATE OR REPLACE TABLE lap_summary AS
        SELECT
          lap_number,
          COUNT(*) as samples_count,
          MAX(speed_kmh) as top_speed_kmh,
          AVG(speed_kmh) as avg_speed_kmh,
          MAX(lat_accel_g) as max_lat_g,
          MIN(fuel_remaining_l) as end_fuel_l,
          MIN(virtual_energy_mj) as end_virtual_energy_mj,
          AVG(mgu_soc_pct) as avg_mgu_soc_pct
        FROM lmu_telemetry
        GROUP BY lap_number
        ORDER BY lap_number;
      `);

      await inspectAndRefreshTables();
    } catch (err: any) {
      console.error('Error generating DuckDB preset:', err);
      setDbError(err.message || 'Failed to load DuckDB dataset');
    } finally {
      setIsInitializing(false);
    }
  };

  // Run custom SQL Query with auto-recovery for missing tables
  const handleExecuteQuery = async (overrideSql?: string) => {
    const queryToRun = overrideSql || sqlQuery;
    if (!queryToRun.trim()) return;

    setIsExecutingQuery(true);
    setQueryError(null);
    const start = performance.now();

    try {
      const res = await executeDuckDBQuery(queryToRun);
      const end = performance.now();
      setQueryResults(res);
      setQueryExecutionTimeMs(Math.round(end - start));
    } catch (err: any) {
      console.error('SQL Execution Error:', err);
      const errMsg = err.message || 'SQL Execution error';

      // Auto-recovery: if table does not exist or catalog error, reset catalog and recover missing tables
      if (
        errMsg.includes('does not exist') ||
        errMsg.includes('lmu_telemetry') ||
        errMsg.includes('lap_summary') ||
        errMsg.includes('Catalog Error')
      ) {
        try {
          console.warn('Recovering missing table or catalog error...');
          await resetDuckDBCatalogContext();

          // If query specifically references lap_summary, ensure lap_summary exists before retrying
          if (queryToRun.toLowerCase().includes('lap_summary')) {
            try {
              await executeDuckDBQuery(`
                CREATE OR REPLACE TABLE lap_summary AS
                SELECT
                  lap_number,
                  COUNT(*) as samples_count,
                  MAX(speed_kmh) as top_speed_kmh,
                  AVG(speed_kmh) as avg_speed_kmh,
                  MAX(lat_accel_g) as max_lat_g,
                  MIN(fuel_remaining_l) as end_fuel_l,
                  MIN(virtual_energy_mj) as end_virtual_energy_mj,
                  AVG(mgu_soc_pct) as avg_mgu_soc_pct
                FROM lmu_telemetry
                GROUP BY lap_number
                ORDER BY lap_number;
              `);
            } catch {
              // Ignore if lmu_telemetry isn't available
            }
          }

          // Retry original query first
          try {
            const retryRes = await executeDuckDBQuery(queryToRun);
            const end = performance.now();
            setQueryResults(retryRes);
            setQueryExecutionTimeMs(Math.round(end - start));
            setQueryError(null);
            return;
          } catch {
            // Full reload of active preset dataset
            await loadPresetDataset(activePresetId || 'bahrain_ginetta_lmp3');
            const retryRes = await executeDuckDBQuery(queryToRun);
            const end = performance.now();
            setQueryResults(retryRes);
            setQueryExecutionTimeMs(Math.round(end - start));
            setQueryError(null);
            return;
          }
        } catch (retryErr: any) {
          console.warn('Retry execution after auto-recovery failed:', retryErr);
        }
      }

      setQueryError(errMsg);
      setQueryResults(null);
    } finally {
      setIsExecutingQuery(false);
    }
  };

  // Export query results as CSV
  const handleExportCSV = () => {
    if (!queryResults || queryResults.rows.length === 0) return;
    const cols = queryResults.columns;
    const csvHeader = cols.join(',');
    const csvRows = queryResults.rows.map((row) => cols.map((c) => JSON.stringify(row[c] ?? '')).join(','));
    const csvContent = [csvHeader, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `duckdb_lmu_telemetry_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Database className="w-80 h-80 text-amber-500" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> DUCKDB WASM ENGINE
              </span>
              <span className="text-slate-400 text-xs font-mono">In-Browser High Performance OLAP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Local DuckDB Telemetry File Analyzer
            </h1>
            <p className="text-slate-400 text-sm max-w-3xl">
              Upload your own local Le Mans Ultimate DuckDB database files (<code className="text-amber-400 font-mono">.duckdb</code>, <code className="text-amber-400 font-mono">.db</code>, <code className="text-amber-400 font-mono">.parquet</code>, <code className="text-amber-400 font-mono">.csv</code>, <code className="text-amber-400 font-mono">.json</code>) to run instant SQL queries, analyze synchronized speed & pedal traces, virtual energy decay, tire temps, and G-force distributions right in your browser.
            </p>
          </div>

          {/* Engine Status & File Info */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-medium">Engine Status:</span>
              {isInitializing ? (
                <span className="text-amber-400 flex items-center gap-1 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Booting WASM...
                </span>
              ) : isDuckDBReady ? (
                <span className="text-emerald-400 flex items-center gap-1 font-mono font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> WASM Active
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" /> Engine Error
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Loaded File:</span>
                <span className="text-amber-400 font-mono font-semibold truncate max-w-[150px]">
                  {currentFileName || 'None'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>File Size:</span>
                <span className="text-slate-200 font-mono">{formatBytes(fileSizeBytes)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{dbError}</span>
        </div>
      )}

      {/* Upload Zone & Presets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dropzone File Upload Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-base">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Upload Local DuckDB Telemetry File</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Supported: .duckdb, .db, .parquet, .csv, .json</span>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 bg-slate-950/60 hover:bg-slate-950 transition rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".duckdb,.db,.sqlite,.parquet,.csv,.json"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition border border-amber-500/30">
              <Database className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-semibold text-base group-hover:text-amber-400 transition">
                Click to browse or drag & drop your DuckDB telemetry file here
              </p>
              <p className="text-slate-400 text-xs">
                Zero server upload — all DuckDB queries run 100% locally in your browser memory
              </p>
            </div>
            <button className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">
              Select Local File
            </button>
          </div>
        </div>

        {/* Demo Preset Selector Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-base">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <span>Demo DuckDB Datasets</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Sample Files</span>
          </div>

          <p className="text-xs text-slate-400">
            Don't have a DuckDB telemetry file on hand? Click any sample preset below to load a simulated Le Mans Ultimate DuckDB telemetry database instantly:
          </p>

          <div className="space-y-2.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPresetDataset(preset.id)}
                disabled={isInitializing}
                className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                  activePresetId === preset.id
                    ? 'bg-amber-500/15 border-amber-500/60 text-white font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <p className="font-bold text-slate-200">{preset.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{preset.filename}</p>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${activePresetId === preset.id ? 'text-amber-400' : 'text-slate-600'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Database Schema & Tables Overview Bar */}
      {tables.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-base">
              <TableIcon className="w-5 h-5 text-emerald-400" />
              <span>Discovered Tables & Views ({tables.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {tables.map((t) => (
                <button
                  key={t.tableName}
                  onClick={() => {
                    setSelectedTable(t.tableName);
                    runAnalysisForTable(t.tableName);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition ${
                    selectedTable === t.tableName
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.tableName} ({t.rowCount.toLocaleString()} rows)
                </button>
              ))}
            </div>
          </div>

          {/* Table Columns Schema */}
          {tables.find((t) => t.tableName === selectedTable) && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 mb-2">
                Schema Columns for <span className="text-amber-400 font-mono">{selectedTable}</span>:
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                {tables
                  .find((t) => t.tableName === selectedTable)
                  ?.columns.map((col) => (
                    <span key={col.name} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                      <span className="text-emerald-400 font-semibold">{col.name}</span>{' '}
                      <span className="text-slate-500">({col.type})</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Synchronized Multi-Channel Telemetry Graph */}
      {chartData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Lap, X-Axis & Channel Column Mappers Controls */}
          <div className="flex flex-col space-y-4 border-b border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <LineChartIcon className="w-5 h-5 text-amber-400" />
                <span>DuckDB Telemetry Trace Viewer</span>
              </div>

              {/* Lap & X-Axis Controls */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {availableLaps.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-400">Select Lap:</span>
                    <select
                      value={selectedLap}
                      onChange={(e) => {
                        const l = Number(e.target.value);
                        setSelectedLap(l);
                        fetchTelemetryForLap(selectedTable, l);
                      }}
                      className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
                    >
                      {availableLaps.map((lap) => (
                        <option key={lap} value={lap} className="bg-slate-900 text-white">
                          Lap {lap}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-400">X-Axis Column:</span>
                  <select
                    value={selectedXAxis}
                    onChange={(e) => setSelectedXAxis(e.target.value)}
                    className="bg-transparent text-sky-400 font-bold focus:outline-none cursor-pointer font-mono"
                  >
                    {(tables.find((t) => t.tableName === selectedTable)?.columns || [{ name: selectedXAxis }]).map((col) => (
                      <option key={col.name} value={col.name} className="bg-slate-900 text-white font-mono">
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => syncFullTelemetryToApp(selectedTable)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg border border-amber-400 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
                  title="Load full telemetry file into Cockpit HUD, Energy, Tires, Sectors & Telemetry Lab"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" /> Sync File Telemetry to All Views
                </button>
              </div>
            </div>

            {/* Dynamic Column Mapping Selectors */}
            {tables.find((t) => t.tableName === selectedTable) && (
              <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Channel Mapping:</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                  <span className="text-slate-400 text-[11px]">Speed:</span>
                  <select
                    value={speedCol}
                    onChange={(e) => setSpeedCol(e.target.value)}
                    className="bg-transparent text-amber-300 font-mono text-[11px] focus:outline-none cursor-pointer"
                  >
                    {tables.find((t) => t.tableName === selectedTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white font-mono">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                  <span className="text-slate-400 text-[11px]">RPM:</span>
                  <select
                    value={rpmCol}
                    onChange={(e) => setRpmCol(e.target.value)}
                    className="bg-transparent text-indigo-300 font-mono text-[11px] focus:outline-none cursor-pointer"
                  >
                    {tables.find((t) => t.tableName === selectedTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white font-mono">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                  <span className="text-slate-400 text-[11px]">Throttle:</span>
                  <select
                    value={throttleCol}
                    onChange={(e) => setThrottleCol(e.target.value)}
                    className="bg-transparent text-emerald-300 font-mono text-[11px] focus:outline-none cursor-pointer"
                  >
                    {tables.find((t) => t.tableName === selectedTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white font-mono">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                  <span className="text-slate-400 text-[11px]">Brake:</span>
                  <select
                    value={brakeCol}
                    onChange={(e) => setBrakeCol(e.target.value)}
                    className="bg-transparent text-rose-300 font-mono text-[11px] focus:outline-none cursor-pointer"
                  >
                    {tables.find((t) => t.tableName === selectedTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white font-mono">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
                  <span className="text-slate-400 text-[11px]">Energy/Fuel:</span>
                  <select
                    value={energyCol}
                    onChange={(e) => setEnergyCol(e.target.value)}
                    className="bg-transparent text-sky-300 font-mono text-[11px] focus:outline-none cursor-pointer"
                  >
                    {tables.find((t) => t.tableName === selectedTable)?.columns.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white font-mono">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Toggle Channels Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowSpeed(!showSpeed)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                showSpeed ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Speed & RPM
            </button>

            <button
              onClick={() => setShowThrottleBrake(!showThrottleBrake)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                showThrottleBrake ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Throttle & Brake
            </button>

            <button
              onClick={() => setShowVirtualEnergy(!showVirtualEnergy)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                showVirtualEnergy ? 'bg-sky-500/20 border-sky-500 text-sky-400' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Virtual Energy & MGU SoC
            </button>

            <button
              onClick={() => setShowTireTemps(!showTireTemps)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                showTireTemps ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Tire Temperatures
            </button>

            <button
              onClick={() => setShowGForces(!showGForces)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
                showGForces ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              G-Forces (Lat/Long)
            </button>
          </div>

          {/* Graph 1: Speed Trace */}
          {showSpeed && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-300">Speed ({speedCol}) & Engine RPM ({rpmCol}) Trace</p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey={selectedXAxis} stroke="#64748b" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey={speedCol} name={`Speed (${speedCol})`} stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey={rpmCol} name={`Engine RPM (${rpmCol})`} stroke="#6366f1" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Graph 2: Driver Pedals */}
          {showThrottleBrake && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-300">Throttle ({throttleCol}) & Brake ({brakeCol}) Pedal Application</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey={selectedXAxis} stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey={throttleCol} name={`Throttle (${throttleCol})`} stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={brakeCol} name={`Brake (${brakeCol})`} stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Graph 3: Virtual Energy & MGU SoC */}
          {showVirtualEnergy && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-300">Virtual Energy / Fuel ({energyCol}) & Hybrid MGU SoC</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey={selectedXAxis} stroke="#64748b" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#38bdf8" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey={energyCol} name={`Energy / Fuel (${energyCol})`} stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey={chartData[0]?.['SoC'] !== undefined ? 'SoC' : 'mgu_soc_pct'} name="MGU Hybrid SoC" stroke="#eab308" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Graph 4: Tire Temps */}
          {showTireTemps && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-300">4-Corner Tire Carcass / Rubber Temperatures (°C)</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey={selectedXAxis} stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="°C" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey={chartData[0]?.['TyresCarcassTemp_FL'] !== undefined ? 'TyresCarcassTemp_FL' : 'tire_temp_fl_c'} name="Front Left (°C)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={chartData[0]?.['TyresCarcassTemp_FR'] !== undefined ? 'TyresCarcassTemp_FR' : 'tire_temp_fr_c'} name="Front Right (°C)" stroke="#fb923c" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={chartData[0]?.['TyresCarcassTemp_RL'] !== undefined ? 'TyresCarcassTemp_RL' : 'tire_temp_rl_c'} name="Rear Left (°C)" stroke="#a855f7" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={chartData[0]?.['TyresCarcassTemp_RR'] !== undefined ? 'TyresCarcassTemp_RR' : 'tire_temp_rr_c'} name="Rear Right (°C)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Graph 5: G-Force Diagram */}
          {showGForces && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-300">G-Force Distribution (Lateral G vs Longitudinal G)</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" dataKey={chartData[0]?.['G Force Lat'] !== undefined ? 'G Force Lat' : 'lat_accel_g'} name="Lateral G" stroke="#64748b" unit=" G" fontSize={11} />
                    <YAxis type="number" dataKey={chartData[0]?.['G Force Long'] !== undefined ? 'G Force Long' : 'long_accel_g'} name="Longitudinal G" stroke="#64748b" unit=" G" fontSize={11} />
                    <ZAxis type="number" dataKey={speedCol} range={[20, 100]} name="Speed" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                    <Scatter name="Telemetry Points" data={chartData} fill="#f59e0b" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SQL Command Console Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <FileCode className="w-5 h-5 text-sky-400" />
            <span>DuckDB SQL Console</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExecuteQuery()}
              disabled={isExecutingQuery || !isDuckDBReady}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 disabled:opacity-50 transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              {isExecutingQuery ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Execute SQL</span>
            </button>

            {queryResults && queryResults.rows.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs hover:text-white transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Query Templates */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400">Pre-Built Le Mans Ultimate SQL Preset Analytics Library:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => {
                const tbl = getActiveTableName();
                const lCol = lapCol || 'lap_number';
                const sCol = speedCol || 'speed_kmh';
                const q = `SELECT "${lCol}", MIN("${sCol}") AS min_apex_speed_kmh, AVG("${sCol}") AS avg_speed_kmh, MAX("${sCol}") AS top_speed_kmh FROM "${tbl}" GROUP BY "${lCol}" ORDER BY "${lCol}";`;
                setSqlQuery(q);
                handleExecuteQuery(q);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-lg transition"
            >
              🏎️ Apex Speed Analysis
            </button>

            <button
              onClick={() => {
                const tbl = getActiveTableName();
                const lCol = lapCol || 'lap_number';
                const bCol = brakeCol || 'brake_pct';
                const xCol = selectedXAxis || 'track_distance_m';
                const q = `SELECT "${lCol}", MIN("${xCol}") AS brake_initiation_meters, MAX("${bCol}") AS max_brake_pct FROM "${tbl}" WHERE "${bCol}" > 20 GROUP BY "${lCol}" ORDER BY "${lCol}";`;
                setSqlQuery(q);
                handleExecuteQuery(q);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 font-bold px-3 py-1.5 rounded-lg transition"
            >
              🛑 Braking Point Consistency
            </button>

            <button
              onClick={() => {
                const tbl = getActiveTableName();
                const lCol = lapCol || 'lap_number';
                const tCol = throttleCol || 'throttle_pct';
                const bCol = brakeCol || 'brake_pct';
                const sCol = speedCol || 'speed_kmh';
                const q = `SELECT "${lCol}", COUNT(*) AS lift_and_coast_samples FROM "${tbl}" WHERE "${tCol}" = 0 AND "${bCol}" = 0 AND "${sCol}" > 150 GROUP BY "${lCol}" ORDER BY "${lCol}";`;
                setSqlQuery(q);
                handleExecuteQuery(q);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sky-400 font-bold px-3 py-1.5 rounded-lg transition"
            >
              🌊 Lift-and-Coast Identification
            </button>

            <button
              onClick={() => {
                const tbl = getActiveTableName();
                const lCol = lapCol || 'lap_number';
                const eCol = energyCol || 'virtual_energy_mj';
                const q = `SELECT "${lCol}", MAX("${eCol}") - MIN("${eCol}") AS virtual_energy_mj_used FROM "${tbl}" GROUP BY "${lCol}" ORDER BY "${lCol}";`;
                setSqlQuery(q);
                handleExecuteQuery(q);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold px-3 py-1.5 rounded-lg transition"
            >
              ⚡ Hybrid Energy Burn & MGU Deployment
            </button>

            <button
              onClick={() => {
                const tbl = getActiveTableName();
                const q = `SELECT * FROM "${tbl}" LIMIT 100;`;
                setSqlQuery(q);
                handleExecuteQuery(q);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              🛞 View Top 100 Rows
            </button>
          </div>
        </div>

        {/* SQL Text Area */}
        <div className="relative font-mono text-xs">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            rows={4}
            placeholder="Type custom SQL query here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-amber-300 focus:outline-none focus:border-amber-500 resize-none font-mono"
          />
        </div>

        {queryError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{queryError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const tbl = getActiveTableName();
                  const defaultQ = `SELECT * FROM "${tbl}" LIMIT 100;`;
                  setSqlQuery(defaultQ);
                  handleExecuteQuery(defaultQ);
                }}
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold rounded-lg transition"
              >
                Reset Default Query
              </button>
              <button
                onClick={() => loadPresetDataset('bahrain_ginetta_lmp3')}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg transition"
              >
                Reload Sample DB
              </button>
            </div>
          </div>
        )}

        {/* Results Table */}
        {queryResults && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Query returned <strong className="text-white">{queryResults.rows.length.toLocaleString()}</strong> rows
              </span>
              {queryExecutionTimeMs !== null && (
                <span className="font-mono text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Execution time: {queryExecutionTimeMs} ms
                </span>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-300 uppercase text-[11px] sticky top-0 border-b border-slate-800">
                  <tr>
                    {queryResults.columns.map((col) => (
                      <th key={col} className="px-3.5 py-2.5 font-bold whitespace-nowrap text-amber-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {queryResults.rows.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition">
                      {queryResults.columns.map((col) => (
                        <td key={col} className="px-3.5 py-2 whitespace-nowrap text-slate-200">
                          {row[col] !== undefined && row[col] !== null ? String(row[col]) : 'NULL'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {queryResults.rows.length > 100 && (
              <p className="text-[11px] text-slate-500 text-center font-mono">
                Showing top 100 rows out of {queryResults.rows.length.toLocaleString()} returned. Export CSV to view full dataset.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
