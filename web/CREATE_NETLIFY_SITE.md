# Create New Netlify Site for KNS MultiRail

## Quick Method: Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Log in with your account (knstechhub35@gmail.com)

2. **Create New Site**
   - Click "Add new site" → "Create site manually"
   - Or click "Add new site" → "Import an existing project" (if you want to connect Git)

3. **Site Configuration**
   - **Site name**: `kns-multirail` (or any name you prefer)
   - **Team**: Select "KNS"

4. **After Site Creation**
   - Note the Site ID (you'll see it in the site settings)
   - Link your local directory:
     ```bash
     cd web
     netlify link --id YOUR_SITE_ID
     ```

5. **Configure Build Settings**
   - Go to Site settings → Build & deploy
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18

6. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Any other required variables

7. **Deploy**
   - If connected to Git: Push to trigger auto-deploy
   - Or use CLI: `netlify deploy --prod`

## Alternative: Use CLI (if prompts work)

```bash
cd web
netlify sites:create --name kns-multirail
netlify link
netlify deploy --prod
```

## Manual Deploy (without Git)

After creating the site and linking:

```bash
cd web
npm run build
netlify deploy --prod --dir=.next
```
