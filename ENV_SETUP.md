# Environment Configuration Guide

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual values:**
   ```bash
   # Required for AI features
   OPENAI_API_KEY=sk-your_actual_openai_api_key_here
   
   # Required for payments (get from Stripe Dashboard)
   STRIPE_SECRET_KEY=sk_test_your_actual_stripe_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_key
   STRIPE_PRICE_PRO=price_your_actual_pro_price_id
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
   ```

3. **Start the application:**
   ```bash
   docker compose up
   ```

## Environment Files

- **`.env`** - Your local development environment (git ignored)
- **`.env.example`** - Template with all required variables (tracked in git)
- **`.env.production`** - Template for production deployment (git ignored)

## Key Variables

### Required
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `STRIPE_SECRET_KEY` - Get from https://dashboard.stripe.com/apikeys
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Random string (min 32 chars)

### Optional
- `GOOGLE_CLIENT_ID` - For Google OAuth login
- `SMTP_*` - For email functionality
- `RATE_LIMIT_*` - API rate limiting settings

## Development vs Production

The `.env` file is set up for Docker development with:
- Database: `postgres:5432` (Docker service name)
- Redis: `redis:6379` (Docker service name)
- Development placeholder keys

For production, use `.env.production` as a template with:
- Real database URLs
- Strong random secrets
- Production API keys
- Production domains

## Security Notes

- Never commit `.env` files to git
- Use strong random secrets for production
- Rotate API keys regularly
- Use different databases for dev/prod