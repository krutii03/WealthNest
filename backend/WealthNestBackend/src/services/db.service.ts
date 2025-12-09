import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
let pool: Pool | null = null;

if (databaseUrl) {
  const isSupabaseDirectConnection = databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co');
  
  if (isSupabaseDirectConnection) {
    console.warn('⚠️  DATABASE_URL appears to be a Supabase direct connection which may not be accessible.');
    console.warn('   Consider removing DATABASE_URL to use Supabase REST API instead, or use connection pooling URL.');
    console.warn('   For now, PostgreSQL wallet operations will be disabled. Using Supabase wallet routes instead.');
    pool = null;
  } else {
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
      });
      
      pool.query('SELECT 1').catch((err) => {
        console.error('⚠️  PostgreSQL connection test failed:', err.message);
        console.warn('   Disabling PostgreSQL wallet operations. Using Supabase wallet routes instead.');
        pool = null;
      });
    } catch (error) {
      console.error('⚠️  Failed to create PostgreSQL pool:', error);
      console.warn('   Disabling PostgreSQL wallet operations. Using Supabase wallet routes instead.');
      pool = null;
    }
  }
} else {
  console.warn('DATABASE_URL not configured. PostgreSQL wallet operations will be disabled. Using Supabase wallet routes instead.');
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (!pool) {
    throw new Error('PostgreSQL connection not available. DATABASE_URL environment variable is not set.');
  }
  
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function beginTransaction() {
  if (!pool) {
    throw new Error('PostgreSQL connection not available. DATABASE_URL environment variable is not set.');
  }
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
}

export async function commitTransaction(client: any) {
  await client.query('COMMIT');
  client.release();
}

export async function rollbackTransaction(client: any) {
  await client.query('ROLLBACK');
  client.release();
}

export function getPool(): Pool | null {
  return pool;
}

export function isDatabaseAvailable(): boolean {
  return pool !== null;
}

export default { query, beginTransaction, commitTransaction, rollbackTransaction, getPool };

