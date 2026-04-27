// config/elasticsearch.js
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: process.env.ES_HOST || 'https://bcab66467945458fb6e5028558f9a874.ap-south-1.aws.elastic-cloud.com:443',
  auth: {
    apiKey: process.env.ES_API_KEY || 'QjI5YjRwTUJCRXNQV2xqNHlWbXQ6UElDQW85WEZRWnFRNFh4UTd3S0wwZw=='
  },
  tls: {
    rejectUnauthorized: false
  },
  requestTimeout: 10000, // 10 seconds
  maxRetries: 2
});

// Test connection (non-blocking)
setTimeout(async () => {
  try {
    const info = await esClient.info();
    console.log('✓ Elasticsearch connected');
    console.log(`  Cluster: ${info.cluster_name}`);
    console.log(`  Version: ${info.version?.number}`);
  } catch (err) {
    console.warn('⚠ Elasticsearch not available:', err.message);
    console.warn('  App will fall back to MySQL for all queries.');
  }
}, 1500);

module.exports = esClient;
