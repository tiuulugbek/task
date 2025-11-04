#!/bin/bash
set -e

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$WEBHOOK_SECRET" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN and WEBHOOK_SECRET must be set"
  exit 1
fi

WEBHOOK_URL="${WEBHOOK_URL:-https://task.acoustic.uz/api/bot/webhook}"

echo "🔗 Setting Telegram webhook..."

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"${WEBHOOK_URL}\",
    \"secret_token\": \"${WEBHOOK_SECRET}\"
  }"

echo ""
echo "✅ Webhook set to: ${WEBHOOK_URL}"
