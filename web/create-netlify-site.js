const https = require('https');
const { execSync } = require('child_process');

// Get Netlify auth token
let authToken;
try {
  const userInfo = execSync('netlify api:getCurrentUser', { encoding: 'utf-8' });
  // Try to extract token from netlify config
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const netlifyConfigPath = path.join(os.homedir(), '.netlify', 'config.json');
  
  if (fs.existsSync(netlifyConfigPath)) {
    const config = JSON.parse(fs.readFileSync(netlifyConfigPath, 'utf-8'));
    authToken = config.users?.[Object.keys(config.users || {})[0]]?.auth?.token;
  }
} catch (e) {
  console.error('Could not get auth token automatically');
  console.log('Please run: netlify login');
  process.exit(1);
}

if (!authToken) {
  console.error('No auth token found. Please run: netlify login');
  process.exit(1);
}

// Get team ID
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
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to get teams: ${res.statusCode}`));
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
    const postData = JSON.stringify({
      name: siteName
    });

    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/sites?team_id=${teamId}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to create site: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// Main execution
(async () => {
  try {
    console.log('Getting teams...');
    const teams = await getTeams();
    
    if (!teams || teams.length === 0) {
      console.error('No teams found');
      process.exit(1);
    }

    const team = teams[0]; // Use first team
    console.log(`Using team: ${team.name} (${team.slug})`);

    const siteName = 'kns-multirail';
    console.log(`Creating site: ${siteName}...`);
    
    const site = await createSite(team.id, siteName);
    
    console.log('\n✅ Site created successfully!');
    console.log(`Site ID: ${site.id}`);
    console.log(`Site Name: ${site.name}`);
    console.log(`Site URL: ${site.ssl_url || site.url}`);
    console.log(`\nTo link this directory to the site, run:`);
    console.log(`netlify link --id ${site.id}`);
    console.log(`\nThen deploy with:`);
    console.log(`netlify deploy --prod`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
