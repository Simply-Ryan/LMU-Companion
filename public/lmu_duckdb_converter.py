import duckdb
import pandas as pd
import argparse
import sys

def convert_lmu_duckdb(input_db_path, output_csv_path):
    print(f"Connecting to {input_db_path}...")
    conn = duckdb.connect(input_db_path, read_only=True)
    
    # Check tables
    tables = conn.execute("SHOW TABLES").fetchall()
    table_names = [t[0] for t in tables]
    
    if len(table_names) == 0:
        print("No tables found in database.")
        sys.exit(1)
        
    print(f"Found {len(table_names)} tables. Converting to flattened telemetry...")
    
    # Start mapping channels
    def get_table_df(name):
        if name in table_names:
            return conn.execute(f'SELECT * FROM "{name}"').df()
        return None

    # Load high-frequency base (e.g. Engine RPM or Ground Speed)
    base_table = 'Engine RPM'
    if base_table not in table_names:
        base_table = table_names[0]
        
    base_df = get_table_df(base_table)
    if base_df is None or base_df.empty:
        print("Could not load base table.")
        sys.exit(1)
        
    base_count = len(base_df)
    print(f"Base table '{base_table}' has {base_count} rows.")
    
    # We will build a unified DataFrame
    out_df = pd.DataFrame()
    out_df['sample_id'] = range(1, base_count + 1)
    
    # Try to map time from GPS Time if available
    gps_time_df = get_table_df("GPS Time")
    if gps_time_df is not None and not gps_time_df.empty:
        out_df['timestamp_s'] = gps_time_df['value']
    else:
        out_df['timestamp_s'] = [i * 0.02 for i in range(base_count)] # Assuming 50Hz default
        
    out_df['current_lap_time_seconds'] = out_df['timestamp_s'] - out_df['timestamp_s'].min()

    # Define channel mappings: (Out Column, LMU Table, Default Value, Multiplier)
    mappings = [
        ('speed_kmh', 'Ground Speed', 0.0, 3.6),
        ('engine_rpm', 'Engine RPM', 0, 1.0),
        ('steering_pct', 'Steering Pos', 0.0, 1.0),
        ('throttle_pct', 'Throttle Pos', 0.0, 1.0),
        ('brake_pct', 'Brake Pos', 0.0, 1.0),
        ('track_distance_m', 'Lap Dist', 0.0, 1.0),
        ('fuel_remaining_l', 'Fuel Level', 0.0, 1.0),
        ('lat_accel_g', 'G Force Lat', 0.0, 1.0),
        ('long_accel_g', 'G Force Long', 0.0, 1.0),
        ('ambient_temp_c', 'Ambient Temperature', 22.5, 1.0),
        ('track_temp_c', 'Track Temperature', 31.0, 1.0),
        ('rain_intensity', 'Minimum Path Wetness', 0.0, 1.0),
    ]
    
    for out_col, lmu_tbl, default_val, multiplier in mappings:
        df = get_table_df(lmu_tbl)
        if df is not None and not df.empty:
            # Upsample or downsample to match base_count
            if len(df) == base_count:
                out_df[out_col] = df['value'] * multiplier
            else:
                # Interpolate by index scaling
                indices = (out_df.index * len(df) / base_count).astype(int)
                out_df[out_col] = df['value'].iloc[indices].values * multiplier
        else:
            out_df[out_col] = default_val

    # Handle events (Lap, Gear) which use ASOF JOIN logic (time-based)
    def map_event(out_col, tbl, default_val):
        df = get_table_df(tbl)
        if df is not None and not df.empty and 'ts' in df.columns:
            # Merge_asof
            df = df.rename(columns={'ts': 'timestamp_s'})
            df = df.sort_values('timestamp_s')
            merged = pd.merge_asof(out_df[['timestamp_s']], df, on='timestamp_s', direction='backward')
            out_df[out_col] = merged['value'].fillna(default_val)
        else:
            out_df[out_col] = default_val

    map_event('gear', 'Gear', 0)
    map_event('lap_number', 'Lap', 1)

    print(f"Exporting unified telemetry to {output_csv_path}...")
    out_df.to_csv(output_csv_path, index=False)
    print("Success!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert LMU .duckdb telemetry file to flat CSV')
    parser.add_argument('input', help='Input .duckdb file path')
    parser.add_argument('output', help='Output .csv file path')
    args = parser.parse_args()
    
    convert_lmu_duckdb(args.input, args.output)
