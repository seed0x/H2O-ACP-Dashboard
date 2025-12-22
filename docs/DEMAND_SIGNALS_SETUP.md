# Demand Signals Component Setup Guide

## Overview

The Demand Signals component shows top search queries from Google Search Console to help inform content creation. It appears as a side panel on the Marketing page.

## Features

- **Top Queries**: Shows top 20 search queries (7d or 30d)
- **Trend Indicators**: Shows up/down trends compared to previous period
- **Service Categorization**: Automatically categorizes queries (water_heater, plumbing, emergency, etc.)
- **Create Content**: One-click button to create a draft ContentItem pre-filled with the query

## Required Credentials

### Option 1: Service Account (Recommended)

1. **Create a Google Cloud Project** (if you don't have one):
   - Go to https://console.cloud.google.com
   - Create a new project or select existing

2. **Enable Search Console API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Search Console API"
   - Click "Enable"

3. **Create Service Account**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Name it (e.g., "search-console-reader")
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"

4. **Create Key**:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Download the JSON file

5. **Grant Access in Search Console**:
   - Go to https://search.google.com/search-console
   - Select your property (e.g., `https://www.h2oplumbers.com` or `sc-domain:h2oplumbers.com`)
   - Go to "Settings" > "Users and permissions"
   - Click "Add user"
   - Enter the service account email (from the JSON file, field: `client_email`)
     - Example: `search-console-reader@h2o-analytics-480220.iam.gserviceaccount.com`
   - Grant "Full" or "Restricted" access (Restricted is sufficient for read-only)
   - Click "Add"

6. **Set Environment Variables**:

   **Option A: JSON File Path (Local Development)**
   ```
   GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH=apps/api/credentials/google-search-console.json
   GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:h2oplumbers.com
   ```
   
   Or use absolute path:
   ```
   GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH=/full/path/to/your/service-account-key.json
   GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:h2oplumbers.com
   ```

   **Option B: JSON Content (for Render/Vercel/Production)**
   ```
   GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:h2oplumbers.com
   ```
   
   **Note**: For production, use the JSON content as an environment variable (more secure than file paths).

### Option 2: OAuth 2.0 (Alternative)

1. **Create OAuth Credentials**:
   - Go to Google Cloud Console > "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs
   - Download credentials JSON

2. **Set Environment Variables**:
   ```
   GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID=your-client-id
   GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET=your-client-secret
   GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:h2oplumbers.com
   ```

## Site URL Format

The `GOOGLE_SEARCH_CONSOLE_SITE_URL` must match exactly how it appears in Search Console:

- **Domain property**: `sc-domain:h2oplumbers.com`
- **URL prefix property**: `https://www.h2oplumbers.com/`
- **Exact URL property**: `https://www.h2oplumbers.com/`

To find your property URL:
1. Go to https://search.google.com/search-console
2. Look at the property selector dropdown
3. Copy the exact format shown

## Environment Variables Summary

### Required:
- `GOOGLE_SEARCH_CONSOLE_SITE_URL` - Your Search Console property URL
- Either:
  - `GOOGLE_SEARCH_CONSOLE_CREDENTIALS_PATH` (path to JSON file), OR
  - `GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON` (JSON content as string)

### Optional:
- `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID` (if using OAuth)
- `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET` (if using OAuth)

## Testing

Once configured, the Demand Signals panel will:
1. Show a floating button on the right side of the Marketing page
2. Click to open the side panel
3. Select 7d or 30d period
4. View top queries with trends
5. Click "Create Content" to generate a draft ContentItem

## Troubleshooting

### "Google Search Console not configured"
- Check that environment variables are set correctly
- Verify the service account has access in Search Console
- Check API logs for authentication errors

### "No search data available"
- Verify the site URL format matches Search Console exactly
- Check that Search Console has data for the selected period
- Ensure the service account has read access

### API Errors
- Verify Search Console API is enabled in Google Cloud Console
- Check service account permissions
- Ensure the property exists in Search Console

## Security Notes

- **Never commit credentials to git**
- Use environment variables or secure credential storage
- Service account keys should be rotated periodically
- Grant minimum required permissions (read-only is sufficient)

