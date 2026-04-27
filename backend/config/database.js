const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'wmpbmi.cwyyxarhb6rz.ap-south-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'wmpbmi',
  password: process.env.DB_PASSWORD || 'QHCJu1GGBtUbjKpGvwSN',
  database: process.env.DB_NAME || 'bmi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 seconds timeout
});

// Test connection with retry logic
let connectionAttempts = 0;
const maxAttempts = 3;

function testConnection() {
  connectionAttempts++;
  const dns = require('dns');
  const hostname = process.env.DB_HOST || 'wmpbmi.cwyyxarhb6rz.ap-south-1.rds.amazonaws.com';
  
  // First check DNS resolution
  dns.lookup(hostname, (dnsErr) => {
    if (dnsErr) {
      console.error('✗ DNS Resolution Failed');
      console.error(`  Hostname: ${hostname}`);
      console.error(`  Error: ${dnsErr.message}`);
      console.error('\n  Troubleshooting Steps:');
      console.error('  1. Verify the database hostname is correct');
      console.error('  2. Check if the RDS instance still exists in AWS');
      console.error('  3. Verify your internet connection');
      console.error('  4. Check DNS settings or try using IP address instead');
      console.error('  5. If using VPN, ensure it\'s connected');
      console.error('  6. Check AWS RDS security groups allow your IP\n');
      console.warn('  Server will continue running, but database operations will fail.');
      return;
    }
    
    // DNS resolved, try database connection
    pool.getConnection()
      .then(connection => {
        console.log('✓ Database connected successfully');
        console.log(`  Host: ${hostname}`);
        console.log(`  Database: ${process.env.DB_NAME || 'bmi'}`);
        console.log(`  Table: ${process.env.DB_TABLE_NAME || 'light_ims'}`);
        connection.release();
        connectionAttempts = 0; // Reset on success
      })
      .catch(err => {
        if (connectionAttempts < maxAttempts) {
          console.warn(`⚠ Database connection attempt ${connectionAttempts}/${maxAttempts} failed: ${err.message}`);
          console.warn('  Retrying in 5 seconds...');
          setTimeout(testConnection, 5000);
        } else {
          console.error('✗ Database connection failed after multiple attempts');
          console.error(`  Error: ${err.message}`);
          console.error(`  Host: ${hostname}`);
          console.error('\n  Possible issues:');
          console.error('  1. Check database credentials in .env file');
          console.error('  2. Verify database server is running');
          console.error('  3. Check firewall/security group settings');
          console.error('  4. Verify network connectivity\n');
          console.warn('  Server will continue running, but database operations may fail.');
        }
      });
  });
}

// Start connection test (non-blocking)
setTimeout(testConnection, 1000);

module.exports = pool;

