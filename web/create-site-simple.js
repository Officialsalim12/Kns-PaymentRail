// Simple script to create Netlify site using API
// Run: node create-site-simple.js

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Read Netlify config
const configPath = path.join(os.homedir(), '.netlify', 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('Netlify config not found. Please run: netlify login');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const users = config.users || {};
const userId = Object.keys(users)[0];

if (!userId || !users[userId]?.auth?.token) {
  console.error('No auth token found. Please run: netlify login');
  process.exit(1);
}

const authToken = users[userId].auth.token;

// Get teams
const getTeams = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      path: '/api/v1/teams',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Create site
const createSite = (teamId, siteName) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ name: siteName });
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/sites${teamId ? `?team_id=${teamId}` : ''}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

(async () => {
  try {
    console.log('Getting teams...');
    const teams = await getTeams();
    const team = teams && teams.length > 0 ? teams[0] : null;
    
    if (team) {
      console.log(`Using team: ${team.name}`);
    }

    const siteName = 'kns-multirail';
    console.log(`Creating site: ${siteName}...`);
    
    const site = await createSite(team?.id, siteName);
    
    console.log('\n✅ Site created successfully!');
    console.log(`Site ID: ${site.id}`);
    console.log(`Site Name: ${site.name}`);
    console.log(`Site URL: ${site.ssl_url || site.url}`);
    console.log(`\nNext steps:`);
    console.log(`1. Link: netlify link --id ${site.id}`);
    console.log(`2. Deploy: netlify deploy --prod`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
