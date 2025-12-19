# ⚠️ DEPRECATED: Vercel Serverless Function Setup

**Status**: This document is **DEPRECATED**. The API is no longer deployed on Vercel.

## Current Architecture

- **Frontend**: Deployed on Vercel (`https://dataflow-eta.vercel.app`)
- **API**: Deployed on Render (`https://h2o-acp-dashboard.onrender.com`)

## Why the Change?

Vercel's Python runtime had compatibility issues with FastAPI's ASGI format, causing persistent `TypeError: issubclass() arg 1 must be a class` errors. The architecture was changed to separate concerns:

- **Vercel**: Optimized for Next.js frontends (CDN, edge functions)
- **Render**: Better for FastAPI backends (long-running processes, database connections)

## Current Documentation

For up-to-date deployment information, see:
- **[DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md)** - Current deployment configuration
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture overview

## Migration Date

December 2024 - Architecture separated to fix Vercel Python runtime issues.
