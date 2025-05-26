import sql from 'mssql';

const config = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_DATABASE || '',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: true, // for Azure
    trustServerCertificate: false,
  },
};

export async function testConnection() {
  let pool;
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('Database connection successful!');
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  } finally {
    if (pool) await pool.close();
  }
}

export async function query(queryString: string, params: any[] = []) {
  let pool;
  try {
    pool = await new sql.ConnectionPool(config).connect();
    const request = pool.request();
    params.forEach((param, idx) => {
      request.input(`param${idx + 1}`, param);
    });
    const result = await request.query(queryString);
    return result.recordset;
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  } finally {
    if (pool) await pool.close();
  }
}

export default sql;
 