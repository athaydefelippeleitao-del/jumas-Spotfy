const https = require('https');
require('dotenv').config();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectId = 'hosqqkeytwmksrpqyuna';

const data = JSON.stringify({
  query: 'ALTER TABLE songs ADD COLUMN "artistIds" JSONB DEFAULT \'[]\'::jsonb;'
});

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${projectId}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => { console.log('Response:', responseData); });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
