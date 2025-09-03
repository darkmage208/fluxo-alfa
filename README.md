# Fluxo Alfa - AI+RAG SaaS Chat Application

A complete, production-ready SaaS application featuring AI-powered chat with RAG (Retrieval-Augmented Generation) capabilities, user authentication, subscription billing, and comprehensive admin tools.

## 🌟 Features

### User Application
- 🔐 **Authentication**: Email/Password + Google OAuth integration
- 💬 **Real-time Chat**: Telegram-style interface with Server-Sent Events streaming
- 🤖 **AI Assistant**: GPT-4o powered responses with contextual RAG search
- 💳 **Billing**: Stripe integration with Free (10 chats/day) and Pro (unlimited) plans
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile

### Admin Dashboard
- 📊 **Analytics**: User metrics, subscription stats, usage tracking
- 👥 **User Management**: CRUD operations, role management, account activation
- 💰 **Subscription Monitoring**: Billing status, plan management, Stripe integration
- 📚 **RAG Content Management**: Create, edit, and manage knowledge base sources
- 🔍 **Usage Analytics**: Token tracking, cost monitoring, performance insights

## 🏗️ Architecture

```
fluxo-alfa/
├── apps/
│   ├── backend/           # Node.js + Express + Prisma + PostgreSQL + pgvector
│   ├── user-frontend/     # React + Vite + TypeScript + TailwindCSS
│   └── admin-frontend/    # React admin dashboard
├── packages/
│   ├── shared/           # Shared TypeScript types and utilities
│   └── ui/              # Shared UI components
└── docker/              # Infrastructure configuration
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Docker** & Docker Compose
- **Git**

### 1-Click Setup
```bash
git clone <your-repo>
cd fluxo-alfa
./scripts/setup.sh
```

### Manual Setup
```bash
# 1. Clone and install
git clone <your-repo>
cd fluxo-alfa
npm install

# 2. Environment setup
cp .env.example .env
# Edit .env with your API keys

# 3. Start infrastructure
npm run docker:up

# 4. Database setup
npm run db:generate
npm run db:migrate  
npm run db:seed

# 5. Start development
npm run dev
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **User App** | http://localhost:3000 | Main chat application |
| **Admin Dashboard** | http://localhost:3001 | Management interface |
| **Backend API** | http://localhost:8000 | REST API + SSE endpoints |
| **API Health** | http://localhost:8000/health | Service status |

### Default Admin Login
- **Email**: `admin@fluxoalfa.com`
- **Password**: `admin123456`

## ⚙️ Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/fluxoalfa
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-chars

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
STRIPE_PRICE_PRO=price_your-pro-price-id
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

## 📦 Available Scripts

### Development
```bash
npm run dev              # Start all services
npm run dev:backend      # Backend only
npm run dev:user-frontend # User app only
npm run dev:admin-frontend # Admin only
```

### Database
```bash
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:seed          # Seed with sample data
npm run db:studio        # Open Prisma Studio
```

### Production
```bash
npm run build           # Build all applications
npm run docker:build    # Build production images
./scripts/deploy.sh     # Deploy to production
```

### Infrastructure
```bash
npm run docker:up       # Start infrastructure
npm run docker:down     # Stop infrastructure
```

## 🔧 Development

### Adding New Features
1. **Backend**: Add routes in `apps/backend/src/routes/`
2. **Frontend**: Add components in `apps/*/src/components/`
3. **Shared Types**: Update `packages/shared/src/types.ts`
4. **Database**: Create migrations with `npx prisma migrate dev`

### Testing
```bash
npm test                # Run all tests
npm run test:backend    # Backend tests only
npm run test:frontend   # Frontend tests only
```

## 🚀 Production Deployment

### Option 1: Docker Compose (Recommended)
```bash
# 1. Configure production environment
cp .env.production .env
# Edit with production values

# 2. Deploy
./scripts/deploy.sh
```

### Option 2: Manual Deployment
```bash
# 1. Build applications
npm run build

# 2. Start production services
docker-compose -f docker-compose.prod.yml up -d

# 3. Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

### Production Checklist
- [ ] Configure production environment variables
- [ ] Set up SSL/TLS certificates
- [ ] Configure domain names and DNS
- [ ] Set up monitoring and logging
- [ ] Configure backup procedures
- [ ] Test Stripe webhooks with production URLs
- [ ] Verify Google OAuth redirect URLs

## 💳 Subscription Plans

| Plan | Features | Pricing |
|------|----------|---------|
| **Free** | 10 chats/day, Basic AI, RAG search | $0/month |
| **Pro** | Unlimited chats, Priority support, Advanced features | $9.99/month |

## 🔌 API Documentation

### Authentication Endpoints
```
POST /auth/register      # User registration
POST /auth/login         # User login
POST /auth/refresh       # Token refresh
GET  /auth/google        # Google OAuth
POST /auth/logout        # User logout
```

### Chat Endpoints
```
POST /chat/thread        # Create chat thread
GET  /chat/threads       # Get user threads
POST /chat/message       # Send message (SSE)
GET  /chat/thread/:id/messages # Get thread messages
```

### Admin Endpoints
```
GET  /admin/metrics/overview  # Dashboard metrics
GET  /admin/users            # User management
GET  /admin/subscriptions    # Subscription monitoring
GET  /admin/sources          # RAG source management
POST /admin/sources          # Create RAG source
```

## 🛠️ Tech Stack

### Backend
- **Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16 + pgvector extension
- **ORM**: Prisma with automatic migrations
- **Cache**: Redis for rate limiting and sessions
- **AI**: OpenAI GPT-4o + text-embedding-small
- **Payments**: Stripe Billing + Webhooks
- **Auth**: JWT + OAuth 2.0 (Google)

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: TailwindCSS + shadcn/ui components
- **State**: Zustand for lightweight state management
- **HTTP**: Axios with interceptors and retry logic
- **Routing**: React Router v6

### Infrastructure
- **Containers**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (production)
- **Process Management**: PM2 (optional)
- **Monitoring**: Winston logging + Health checks

## 🔍 Monitoring & Observability

### Health Checks
- Backend API: `GET /health`
- Database connectivity verification
- Redis connection monitoring
- OpenAI API status checking

### Logging
- Structured JSON logging with Winston
- Request/response logging with Morgan
- Error tracking with stack traces
- Performance metrics collection

### Metrics
- User engagement analytics
- Token usage and cost tracking
- Subscription conversion rates
- System performance monitoring

## 🔒 Security Features

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Express rate limiter with Redis backend
- **Input Validation**: Zod schemas for request validation
- **Security Headers**: Helmet.js for HTTP security
- **CORS**: Configurable cross-origin resource sharing
- **Environment**: Secure environment variable management

## 📊 Business Intelligence

### User Analytics
- Registration and activation rates
- Chat engagement metrics
- Subscription conversion funnel
- Churn analysis and retention

### Financial Metrics
- Monthly Recurring Revenue (MRR)
- Customer Lifetime Value (CLV)
- AI API cost optimization
- Profit margin analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o and embedding models
- **Stripe** for payment processing
- **Vercel** for shadcn/ui components
- **Prisma** for excellent ORM experience
- **pgvector** for vector similarity search

---

**Made with ❤️ for the AI community**

🌟 **Star this repo if it helped you build something awesome!** 🌟