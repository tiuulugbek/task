# Real Server Setup Guide

Complete guide for deploying Acoustic Task Manager to a production server.

## Prerequisites

- Ubuntu 22.04 LTS server (or similar Linux distribution)
- Root or sudo access
- Domain name pointing to your server IP (e.g., `task.acoustic.uz`)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

## Step 1: Server Preparation

SSH into your server and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Log out and back in for Docker group to take effect
exit
```

## Step 2: Clone Repository

```bash
# Create project directory
sudo mkdir -p /var/www
cd /var/www

# Clone your repository
sudo git clone <your-repo-url> task.acoustic.uz
cd task.acoustic.uz

# Set ownership
sudo chown -R $USER:$USER .
```

Or if you're already on the server with the code:

```bash
cd /path/to/acoustic-task-manager
```

## Step 3: Configure Environment

Run the setup script to create and configure `.env`:

```bash
cd /var/www/task.acoustic.uz  # or your project path
./infra/scripts/setup-server.sh
```

This will:
- Create `infra/.env` from the example
- Generate secure random passwords and secrets
- Show you what needs to be configured

**Then edit `infra/.env`** and set:

```bash
nano infra/.env
```

**Required values to set:**
- `TELEGRAM_BOT_TOKEN`: Your bot token from @BotFather
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME`: Your bot username (without @)

**Optional (if different from defaults):**
- `ALLOWED_ORIGIN`: Your domain (default: `https://task.acoustic.uz`)
- `NEXT_PUBLIC_API_URL`: Your API URL (default: `https://task.acoustic.uz/api`)
- `WEBHOOK_URL`: Telegram webhook URL (default: `https://task.acoustic.uz/api/bot/webhook`)

## Step 4: Configure DNS

Point your domain to your server IP:

```
A Record: task.acoustic.uz -> YOUR_SERVER_IP
```

Verify DNS is working:

```bash
dig task.acoustic.uz +short
# Should show your server IP
```

## Step 5: Deploy Services

```bash
cd /var/www/task.acoustic.uz

# Bootstrap the system (builds, starts services, runs migrations)
./infra/scripts/bootstrap.sh
```

This will:
- Build Docker images
- Start all services
- Run database migrations
- Seed initial data

**Check services are running:**

```bash
docker-compose -f infra/docker-compose.yml ps
```

**Check logs if needed:**

```bash
docker-compose -f infra/docker-compose.yml logs -f
```

## Step 6: Setup SSL Certificate

```bash
cd /var/www/task.acoustic.uz

# Make sure ports 80 and 443 are free
sudo lsof -i :80
sudo lsof -i :443

# Stop any conflicting services (nginx, apache)
sudo systemctl stop nginx apache2 2>/dev/null || true

# Run SSL setup
./infra/scripts/setup-ssl.sh
```

Or manually set DOMAIN and EMAIL:

```bash
DOMAIN=task.acoustic.uz EMAIL=your-email@example.com ./infra/scripts/setup-ssl.sh
```

This will:
- Stop nginx temporarily
- Obtain Let's Encrypt certificate
- Copy certificates to `infra/nginx/ssl/`
- Restart nginx

## Step 7: Configure Telegram Webhook

```bash
cd /var/www/task.acoustic.uz

# Set webhook (reads from infra/.env)
./infra/scripts/set_webhook.sh
```

This configures Telegram to send updates to your server.

## Step 8: Verify Deployment

```bash
# Check health endpoint
curl https://task.acoustic.uz/healthz

# Check API docs
curl https://task.acoustic.uz/api/docs

# Check services status
docker-compose -f infra/docker-compose.yml ps

# View logs
docker-compose -f infra/docker-compose.yml logs -f
```

## Step 9: Setup Automatic Backups

Add to crontab (runs daily at 23:50 Asia/Tashkent):

```bash
sudo crontab -e

# Add this line:
50 23 * * * /var/www/task.acoustic.uz/infra/scripts/backup_pg.sh
```

Backups are stored in `/var/backups/acoustic-task-manager/` with 7-day retention.

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f infra/docker-compose.yml logs

# Check specific service
docker-compose -f infra/docker-compose.yml logs api-gateway

# Restart services
docker-compose -f infra/docker-compose.yml restart
```

### Port 80/443 Already in Use

```bash
# Find what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting services
sudo systemctl stop nginx apache2
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f infra/docker-compose.yml exec postgres psql -U acoustic -d acoustic -c "SELECT 1;"

# Check database logs
docker-compose -f infra/docker-compose.yml logs postgres
```

### SSL Certificate Issues

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Renew certificate manually
sudo certbot renew
sudo docker-compose -f infra/docker-compose.yml restart nginx
```

### Webhook Not Working

```bash
# Check webhook secret matches
grep WEBHOOK_SECRET infra/.env

# Re-set webhook
./infra/scripts/set_webhook.sh

# Check telegram-bot-service logs
docker-compose -f infra/docker-compose.yml logs telegram-bot-service
```

### Nginx Configuration

The main nginx config is at: `infra/nginx/nginx.conf`
The site config is at: `infra/nginx/conf.d/acoustic.conf`

After changing nginx config:

```bash
docker-compose -f infra/docker-compose.yml restart nginx
```

## Updating Services

```bash
cd /var/www/task.acoustic.uz

# Pull latest code
git pull

# Rebuild and restart
docker-compose -f infra/docker-compose.yml up -d --build

# Run migrations if schema changed
./infra/scripts/migrate.sh
```

## Useful Commands

```bash
# View all service logs
docker-compose -f infra/docker-compose.yml logs -f

# View specific service logs
docker-compose -f infra/docker-compose.yml logs -f api-gateway

# Restart a service
docker-compose -f infra/docker-compose.yml restart api-gateway

# Stop all services
docker-compose -f infra/docker-compose.yml down

# Start all services
docker-compose -f infra/docker-compose.yml up -d

# Access PostgreSQL
docker-compose -f infra/docker-compose.yml exec postgres psql -U acoustic -d acoustic

# Backup database
./infra/scripts/backup_pg.sh

# Restore database
./infra/scripts/restore_pg.sh /path/to/backup.sql.gz
```

## Security Notes

1. **Never commit `.env` file** - It contains sensitive secrets
2. **Use strong passwords** - Generated by `setup-server.sh` script
3. **Keep SSL certificates updated** - Let's Encrypt auto-renewal recommended
4. **Regular backups** - Ensure backup cron job is running
5. **Firewall** - Only expose ports 80, 443, and SSH (22)

## Support

If you encounter issues:
1. Check service logs: `docker-compose -f infra/docker-compose.yml logs`
2. Verify `.env` configuration
3. Check DNS resolution
4. Verify SSL certificates are valid
5. Check firewall rules

