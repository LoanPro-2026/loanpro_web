import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export async function createUserDatabase(username: string) {
  const dbName = `loan_${username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const schemaPath = path.join(process.cwd(), 'Schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true, // important for executing full schema files
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.changeUser({ database: dbName });
    await connection.query(schemaSql);
    console.log(`✅ Schema applied to ${dbName}`);
  } catch (err) {
    console.error('❌ Error applying schema:', err);
    throw err;
  } finally {
    await connection.end();
  }
}
