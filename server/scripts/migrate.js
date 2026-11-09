import { readFile } from 'node:fs/promises';
import { db } from '../src/db.js';

try {
  const sql = await readFile(
    new URL('../schema.sql', import.meta.url),
    'utf8'
  );
  await db.query(sql);
  console.log('Database tables created successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
