# Payment Gateway Setup Guide

This guide explains how to configure all three payment gateways (Stripe, MercadoPago, and Kiwify) for the Fluxo Alfa platform.

## Quick Start

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your payment gateway credentials in the `.env` file

3. Generate Prisma client:
   ```bash
   cd apps/backend
   npx prisma generate
   ```

4. Run database migrations:
   ```bash
   npx prisma db push
   ```

## Required Environment Variables

All required environment variables are documented in `.env.example`. The key payment gateway configurations are:

### Stripe (Primary Gateway)
```bash
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_PRICE_PRO=price_... # Stripe price ID for Pro plan
STRIPE_WEBHOOK_SECRET=whsec_... # Stripe webhook signing secret
```

### MercadoPago (Latin America)
```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-... # MercadoPago access token
MERCADOPAGO_PUBLIC_KEY=TEST-... # MercadoPago public key
MERCADOPAGO_WEBHOOK_SECRET=your_webhook_secret # Webhook secret
```

### Kiwify (Brazil)
```bash
KIWIFY_API_TOKEN=your_api_token # Kiwify API token
KIWIFY_ACCOUNT_ID=your_account_id # Kiwify account ID
KIWIFY_WEBHOOK_TOKEN=your_webhook_token # Webhook validation token
KIWIFY_PRO_PRODUCT_ID=your_product_id # Product ID for Pro plan
KIWIFY_CHECKOUT_BASE_URL=https://checkout.kiwify.com # Kiwify checkout URL
```

## Setup Instructions

### 1. Stripe Setup

1. Create a [Stripe account](https://stripe.com)
2. Go to **Products** → Create a new product for "Pro Plan"
3. Set recurring billing (monthly) with amount $36 USD
4. Copy the Price ID to `STRIPE_PRICE_PRO`
5. Get API keys from **Developers** → **API keys**
6. Create webhook endpoint: `https://yourdomain.com/billing/webhook/stripe`
7. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
8. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 2. MercadoPago Setup

1. Create a [MercadoPago Developer account](https://www.mercadopago.com/developers)
2. Create a new application
3. Copy the **Access Token** to `MERCADOPAGO_ACCESS_TOKEN`
4. Copy the **Public Key** to `MERCADOPAGO_PUBLIC_KEY`
5. Configure webhook URL: `https://yourdomain.com/billing/webhook/mercado_pago`
6. Enable events: `subscription_preapproval`, `payment`

### 3. Kiwify Setup

1. Create a [Kiwify account](https://kiwify.com)
2. Create a new product for "Pro Plan" with R$197 monthly recurring
3. Get API credentials from your account settings
4. Copy **API Token** to `KIWIFY_API_TOKEN`
5. Copy **Account ID** to `KIWIFY_ACCOUNT_ID`
6. Copy **Product ID** to `KIWIFY_PRO_PRODUCT_ID`
7. Configure webhook URL: `https://yourdomain.com/billing/webhook/kiwify`
8. Enable events: `subscription_canceled`, `subscription_renewed`, `subscription_late`, `compra_aprovada`

## Database Migration

Run the following command to ensure your database schema is up to date:

```bash
cd apps/backend
npx prisma db push
```

## Testing Webhooks

### Local Development

For local testing, use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 8000
```

Then use the ngrok URL for webhook configuration:
- Stripe: `https://your-ngrok-url.ngrok.io/billing/webhook/stripe`
- MercadoPago: `https://your-ngrok-url.ngrok.io/billing/webhook/mercado_pago`
- Kiwify: `https://your-ngrok-url.ngrok.io/billing/webhook/kiwify`

### Testing Events

Each gateway provides test tools:

**Stripe**: Use Stripe CLI to forward events
```bash
stripe listen --forward-to localhost:8000/billing/webhook/stripe
```

**MercadoPago**: Use test cards and accounts from their documentation

**Kiwify**: Use test webhook functionality in their dashboard

## Supported Features

### All Gateways Support:
- ✅ Subscription creation
- ✅ Payment processing
- ✅ Webhook notifications
- ✅ Subscription cancellation
- ✅ Payment status updates

### Gateway-Specific Features:

**Stripe**:
- Customer portal for self-service
- Multiple payment methods
- Global currency support
- Robust retry logic

**MercadoPago**:
- PIX payments (Brazil)
- Local payment methods
- Latin America focus
- Bank transfer support

**Kiwify**:
- Brazilian market optimization
- PIX integration
- Local tax handling
- Portuguese interface

## Currency Support

- **Stripe**: USD, EUR, BRL, and 100+ other currencies
- **MercadoPago**: BRL, ARS, MXN, and other Latin American currencies
- **Kiwify**: BRL (Brazilian Real) only

## Production Checklist

- [ ] All environment variables configured
- [ ] Webhook endpoints accessible via HTTPS
- [ ] Database migrations applied
- [ ] Test transactions completed
- [ ] Webhook signatures validated
- [ ] Error handling tested
- [ ] Customer portal links working
- [ ] Subscription cancellation flows tested

## Troubleshooting

### Common Issues:

1. **Webhook validation errors**: Ensure webhook secrets are correctly configured
2. **CORS issues**: Check that your frontend domain is in `ALLOWED_ORIGINS`
3. **Database connection errors**: Verify `DATABASE_URL` is correct
4. **Gateway API errors**: Check API keys and account status

### Debug Mode:

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Support Contacts:

- **Stripe**: [Stripe Support](https://support.stripe.com)
- **MercadoPago**: [MercadoPago Developers](https://www.mercadopago.com/developers/en/support)
- **Kiwify**: [Kiwify Help Center](https://help.kiwify.com)