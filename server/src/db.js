import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({
  path: new URL('../.env', import.meta.url)
});

export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
