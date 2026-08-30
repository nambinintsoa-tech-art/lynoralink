const { Client } = require('pg');

// Configuration from .env
const connectionString = process.env.DATABASE_URL || 'postgresql://lynoralink_user:2YM7aS7OIB5rjOTUJYXnBTzh5F5E3pJX@dpg-da9d6bm7bikc738vs1t0-a.ohio-postgres.render.com/lynoralink?sslmode=require';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Check if tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Tables in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    if (result.rows.length === 0) {
      console.log('⚠️  No tables found! Database appears empty.');
    } else {
      console.log(`✅ Found ${result.rows.length} tables`);
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  }
}

testConnection();