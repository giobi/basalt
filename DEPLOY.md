# Basalt - Deployment Guide

## Cloudflare Pages Deployment

### Prerequisites
- Cloudflare account
- GitHub repository pushed with the code
- Wrangler CLI installed (optional, for CLI deployment)

### Method 1: Cloudflare Dashboard (Recommended)

1. **Connect GitHub Repository**
   - Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
   - Click "Create a project"
   - Connect your GitHub account
   - Select the `giobi/basalt` repository

2. **Configure Build Settings**
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/`
   - **Node version**: 20

3. **Environment Variables**
   None required for MVP (using public GitHub API)

4. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your site will be available at `basalt.pages.dev`

### Method 2: Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy .next --project-name=basalt
```

### Method 3: GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: basalt
          directory: .next
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

## Custom Domain

1. Go to your Cloudflare Pages project
2. Click "Custom domains"
3. Add domain: `basalt.yourdomain.com`
4. Add CNAME record in your DNS: `basalt` → `basalt.pages.dev`

## Troubleshooting

### Build Fails
- Check Node version is 20+
- Verify all dependencies are in package.json
- Check build logs for specific errors

### GitHub API Rate Limiting
- Build uses GitHub public API (60 requests/hour)
- Production uses 1-hour cache to reduce API calls
- For higher limits, add GitHub token (future enhancement)

### Pages Not Loading
- Verify build completed successfully
- Check browser console for errors
- Ensure `.next` directory is being deployed

## Performance

- **First Load**: ~2s (GitHub API fetch + render)
- **Cached Load**: ~500ms (using Cloudflare KV cache)
- **Build Time**: ~1-2 minutes

## Monitoring

Cloudflare Pages provides:
- Analytics dashboard
- Request logs
- Error tracking
- Performance metrics

Access at: `https://dash.cloudflare.com/[account-id]/pages/view/basalt`

---

## Next Steps

After successful deployment:

1. Test the site at `basalt.pages.dev`
2. Verify wikilinks work correctly
3. Check file browser navigation
4. Test search functionality
5. Configure custom domain (optional)
6. Set up monitoring alerts (optional)

---

Built with Claude Code 🚀
