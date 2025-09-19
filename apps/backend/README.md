# Fluxo Alfa Backend

AI-powered chat platform backend with multi-gateway payment processing.

## Quick Start

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Fill in your environment variables
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── config/          # Configuration files (database, env, logger)
├── interfaces/      # TypeScript interfaces and types
├── middleware/      # Express middleware functions
├── routes/          # API route handlers
├── scripts/         # Utility scripts (seed, etc.)
├── services/        # Business logic services
│   └── paymentGateways/  # Payment gateway implementations
└── types/           # TypeScript type definitions
```

## Features

- **Multi-Gateway Payments**: Stripe, MercadoPago, Kiwify
- **AI Chat**: OpenAI integration with embedding support
- **Authentication**: JWT-based auth with Google OAuth
- **Rate Limiting**: Built-in request rate limiting
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis support for session management

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler check

## Environment Variables

See `.env.example` for all required environment variables. Key categories:

- **Database**: PostgreSQL and Redis URLs
- **Authentication**: JWT secrets and Google OAuth
- **Payment Gateways**: Stripe, MercadoPago, Kiwify credentials
- **AI Services**: OpenAI API configuration
- **Application**: CORS, rate limiting, logging settings

For detailed payment setup, see [PAYMENT_SETUP.md](../../PAYMENT_SETUP.md).

## API Endpoints

- `GET /health` - Health check
- `POST /auth/*` - Authentication endpoints
- `POST /chat/*` - Chat and messaging
- `POST /billing/*` - Payment and subscription management
- `GET /admin/*` - Admin dashboard endpoints