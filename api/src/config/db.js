import mysql from 'mysql2/promise';
import mssql from 'mssql';

export const dialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();
let pool;

export function assertReadOnly(statement) {
  const normalized = String(statement)
    .replace(/^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '')
    .trim()
    .toUpperCase();
  const tokens = normalized.replace(/N?'(?:''|[^'])*'/g, "''");
  if (!/^SELECT\b/.test(tokens) || /;|--|\/\*|\*\//.test(tokens) || /\b(INTO|INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|DENY|BACKUP|RESTORE|OPENROWSET|OPENQUERY|OPENDATASOURCE|NEXT\s+VALUE)\b/.test(tokens)) {
    throw new Error('Database is read-only. Only SELECT statements are allowed by this API.');
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function connectDatabase() {
  if (pool) return pool;

  if (dialect === 'mysql') {
    pool = mysql.createPool({
      host: required('DB_HOST'),
      port: Number(process.env.DB_PORT || 3306),
      database: required('DB_NAME'),
      user: required('DB_USER'),
      password: required('DB_PASSWORD'),
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false
    });
    await pool.query('SELECT 1');
    return pool;
  }

  if (dialect === 'mssql') {
    pool = await mssql.connect({
      server: required('DB_HOST'),
      port: Number(process.env.DB_PORT || 1433),
      database: required('DB_NAME'),
      user: required('DB_USER'),
      password: required('DB_PASSWORD'),
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
      }
    });
    await pool.request().query('SELECT 1');
    return pool;
  }

  throw new Error('DB_DIALECT must be either "mysql" or "mssql".');
}

// Use named @parameters in all route queries. This helper translates them for MySQL.
export async function query(sql, params = {}) {
  assertReadOnly(sql);
  const database = await connectDatabase();

  if (dialect === 'mysql') {
    const names = [...sql.matchAll(/@(\w+)/g)].map((match) => match[1]);
    const statement = sql.replace(/@\w+/g, '?');
    const values = names.map((name) => params[name]);
    const [rows] = await database.execute(statement, values);
    return rows;
  }

  const request = database.request();
  for (const [name, value] of Object.entries(params)) request.input(name, value);
  const result = await request.query(sql);
  return result.recordset;
}
