# Deploy to Netlify

## Option 1: Deploy via Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository (GitHub/GitLab/Bitbucket)
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18
5. Add environment variables in Site settings → Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Any other required environment variables
6. Click "Deploy site"

## Option 2: Deploy via CLI (if interactive prompts work)

Run these commands in the `web` directory:

```bash
# Link to existing site or create new one
netlify link

# Or create new site
netlify sites:create --name kns-multirail

# Deploy to production
netlify deploy --prod
```

## Option 3: Manual Deploy via CLI (non-interactive)

If you have a site ID, you can deploy directly:

```bash
netlify deploy --prod --dir=.next --site=YOUR_SITE_ID
```

## Build Output

The build output is in `.next` directory. Netlify will automatically:
- Install dependencies
- Run `npm run build`
- Deploy the `.next` output using the Next.js runtime plugin

## Environment Variables

Make sure to set these in Netlify Dashboard → Site settings → Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Any other environment variables your app needs
