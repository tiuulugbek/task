#!/bin/bash
set -e

echo "🔧 Setting up Acoustic Task Manager for Real Server..."
echo ""

cd "$(dirname "$0")/../.."

# Check if .env already exists
if [ -f "infra/.env" ]; then
  echo "⚠️  infra/.env already exists. Backing up to infra/.env.backup"
  cp infra/.env infra/.env.backup
fi

# Create .env from example
if [ ! -f "infra/.env.example" ]; then
  echo "❌ infra/.env.example not found!"
  exit 1
fi

cp infra/.env.example infra/.env

echo "📝 Created infra/.env file"
echo ""
echo "🔑 Please edit infra/.env and set the following values:"
echo ""
echo "Required:"
echo "  - POSTGRES_PASSWORD: Strong password for PostgreSQL"
echo "  - RABBITMQ_PASSWORD: Strong password for RabbitMQ"
echo "  - JWT_SECRET: Generate with: openssl rand -hex 32"
echo "  - JWT_REFRESH_SECRET: Generate with: openssl rand -hex 32"
echo "  - INTERNAL_SECRET: Generate with: openssl rand -hex 32"
echo "  - TELEGRAM_BOT_TOKEN: Your Telegram bot token from @BotFather"
echo "  - WEBHOOK_SECRET: Generate with: openssl rand -hex 32"
echo "  - NEXT_PUBLIC_TELEGRAM_BOT_NAME: Your bot username"
echo ""
echo "Optional (if different from defaults):"
echo "  - DOMAIN: Default is task.acoustic.uz"
echo "  - ALLOWED_ORIGIN: Default is https://task.acoustic.uz"
echo "  - NEXT_PUBLIC_API_URL: Default is https://task.acoustic.uz/api"
echo ""

# Generate secrets helper
echo "💡 Quick secret generator:"
echo ""
echo "Generating secrets for you..."
POSTGRES_PASS=$(openssl rand -hex 16)
RABBITMQ_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
INTERNAL_SECRET=$(openssl rand -hex 32)
WEBHOOK_SECRET=$(openssl rand -hex 32)

# Update .env with generated secrets
sed -i.bak "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASS/" infra/.env
sed -i.bak "s/^RABBITMQ_PASSWORD=.*/RABBITMQ_PASSWORD=$RABBITMQ_PASS/" infra/.env
sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" infra/.env
sed -i.bak "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" infra/.env
sed -i.bak "s/^INTERNAL_SECRET=.*/INTERNAL_SECRET=$INTERNAL_SECRET/" infra/.env
sed -i.bak "s/^WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$WEBHOOK_SECRET/" infra/.env

# Clean up backup files
rm -f infra/.env.bak

echo "✅ Generated and set random secrets!"
echo ""
echo "📋 Next steps:"
echo "1. Edit infra/.env and set:"
echo "   - TELEGRAM_BOT_TOKEN (from @BotFather)"
echo "   - NEXT_PUBLIC_TELEGRAM_BOT_NAME (your bot username)"
echo "   - Update domain if different from task.acoustic.uz"
echo ""
echo "2. Run: ./infra/scripts/bootstrap.sh"
echo ""
echo "3. After services start, configure DNS and SSL:"
echo "   - Point DNS: task.acoustic.uz -> YOUR_SERVER_IP"
echo "   - Run: ./infra/scripts/setup-ssl.sh"
echo ""
echo "4. Set Telegram webhook:"
echo "   - Run: ./infra/scripts/set_webhook.sh"
echo ""

