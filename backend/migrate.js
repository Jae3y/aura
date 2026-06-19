const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.alqgntqtugmzcglnisrx',
  password: 'Eckankar@51',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase via Pooler port 6543!');
    const sql = fs.readFileSync('../supabase/migrations/001_aura_schema.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    await client.end();
  }
}

run();
