import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectId = 'hosqqkeytwmksrpqyuna';
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: 'ALTER TABLE songs ADD COLUMN "artistIds" JSONB DEFAULT \'[]\'::jsonb;' })
  });

  const data = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", data);
}

run();
