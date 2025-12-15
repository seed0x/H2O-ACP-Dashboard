# Production Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ or similar)
- Docker & Docker Compose installed
- Domain name pointing to your server
- At least 2GB RAM, 20GB disk space

## Step 1: Server Setup

### Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Setup Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Step 2: Clone & Configure

```bash
# Clone your repository
cd /opt
sudo mkdir plumbing-ops
sudo chown $USER:$USER plumbing-ops
cd plumbing-ops
git clone <your-repo-url> .

# Create production environment file
cp .env.production.template .env.production
```

### Edit `.env.production`

```bash
nano .env.production
```

**CRITICAL: Update these values:**

```env
ENVIRONMENT=production

# Generate strong password for database
DB_PASSWORD=<use: openssl rand -base64 32>
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@db:5432/plumbing

# Generate strong admin password
ADMIN_PASSWORD=<strong-password-here>

# Generate JWT secret (64 characters)
JWT_SECRET=<use: openssl rand -hex 32>

# Your production domain(s)
CORS_ORIGINS=https://ops.yourdomain.com

# API URL for frontend
API_URL=http://api:8000
```

## Step 3: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot -y

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d ops.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/ops.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/ops.yourdomain.com/privkey.pem
```

### Link certificates to nginx

```bash
# Create ssl directory
mkdir -p infra/nginx/ssl

# Link certificates
sudo ln -s /etc/letsencrypt/live/ops.yourdomain.com/fullchain.pem infra/nginx/ssl/fullchain.pem
sudo ln -s /etc/letsencrypt/live/ops.yourdomain.com/privkey.pem infra/nginx/ssl/privkey.pem
```

### Update nginx.conf

Edit `infra/nginx/nginx.conf` and uncomment the SSL configuration lines (search for "SSL configuration").

Also uncomment the HTTP to HTTPS redirect block and update `server_name` with your domain.

### Option B: Self-Signed (Development/Testing Only)

```bash
mkdir -p infra/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/ssl/privkey.pem \
  -out infra/nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

## Step 4: Build & Deploy

```bash
# Build images
cd infra
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## Step 5: Database Initialization

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml run --rm api alembic upgrade head

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml run --rm api python -m app.seed
```

## Step 6: Verify Deployment

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl http://localhost/api/health

# Test from outside (replace with your domain)
curl https://ops.yourdomain.com/api/health
```

## Step 7: Setup Automated Backups

```bash
# Make backup script executable
chmod +x scripts/backup-db.sh

# Create backup directory
sudo mkdir -p /backups/postgres
sudo chown $USER:$USER /backups/postgres

# Test backup
./scripts/backup-db.sh

# Setup daily cron job
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /opt/plumbing-ops/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

## Step 8: Monitoring Setup (Optional but Recommended)

### Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/plumbing-ops
```

Add:

```
/opt/plumbing-ops/infra/nginx/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

### Setup Uptime Monitoring

Use a service like:
- UptimeRobot (free tier available)
- Pingdom
- StatusCake

Monitor: `https://ops.yourdomain.com/api/health`

## Maintenance Commands

### View Logs

```bash
cd /opt/plumbing-ops/infra

# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api
```

### Update Application

```bash
cd /opt/plumbing-ops

# Pull latest code
git pull

# Rebuild and restart
cd infra
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if needed
docker-compose -f docker-compose.prod.yml run --rm api alembic upgrade head
```

### Restore from Backup

```bash
# Stop services
cd /opt/plumbing-ops/infra
docker-compose -f docker-compose.prod.yml down

# Restore database
gunzip < /backups/postgres/plumbing_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.prod.yml run --rm -T db psql -U postgres plumbing

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -m
```

### Can't connect to database

```bash
# Check if database is running
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### Nginx errors

```bash
# Check nginx config syntax
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# View nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

## Security Checklist

- [ ] Strong passwords set in `.env.production`
- [ ] JWT secret is random and secure
- [ ] SSL/TLS certificate installed and valid
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] Daily backups configured
- [ ] Backup restoration tested
- [ ] Monitoring/alerting setup
- [ ] Regular updates scheduled
- [ ] `.env.production` file permissions set to 600

## First Login

1. Navigate to `https://ops.yourdomain.com`
2. Click "Login" in the navigation
3. Enter the `ADMIN_PASSWORD` you set in `.env.production`
4. You should be redirected to the dashboard

## Support

For issues, check:
1. Application logs: `docker-compose -f docker-compose.prod.yml logs`
2. Nginx access logs: `infra/nginx/logs/access.log`
3. Nginx error logs: `infra/nginx/logs/error.log`
