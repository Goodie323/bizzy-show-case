# Bizzy 🤖
### The first employee a small business owner never had to hire.

**Bizzy** is a WhatsApp-native AI business assistant built for Nigerian small and medium enterprises. It turns any merchant's dedicated WhatsApp number into an intelligent, always-on business engine — handling customer conversations, generating receipts, tracking inventory, negotiating prices, and sending follow-ups automatically.

No app to download. No interface to learn. If a merchant can send a WhatsApp message, they can run their business on Bizzy.

---

## 🏆 Built for the Build with Gemini XPRIZE 2026
**Category:** Small Business Services  
**Prize Pool:** $2,000,000  
**Powered by:** Gemini 2.5 Flash · Google AI Studio · FastAPI · PostgreSQL · Redis

---

## 🎯 The Problem

Millions of small business owners across Nigeria are still running their business on paper. They sell a shirt, write it on a scrap of paper, lose track of who owes them, forget to follow up with customers, and miss sales because they couldn't respond fast enough.

Traditional enterprise point-of-sale apps don't work for them — they drain batteries, consume mobile data, and have a painful learning curve. These merchants don't need another app. They need a solution that works inside the tool they already use every day: **WhatsApp.**

---

## ✅ The Solution

Bizzy activates a merchant's existing WhatsApp Business number as an AI-powered business engine. Customers text the merchant's real Nigerian +234 number. Bizzy — powered by Gemini 2.5 Flash — handles the entire conversation, processes orders, generates receipts, and alerts the merchant in real time.

```
Customer texts merchant's Bizzy number
              ↓
Gemini 2.5 Flash processes the intent
              ↓
Bizzy responds as that merchant's business
              ↓
Order saved · Receipt sent · Merchant alerted
```

---

## 🛠️ Core Features

### Bizzy Records
Converts raw text or voice notes into clean, branded PDF receipts delivered to the customer's WhatsApp instantly.

### Bizzy Watches
Tracks inventory on every transaction and pushes a daily earnings summary to the merchant at closing time.

### Bizzy Talks
Handles automated customer follow-ups, debt reminders, and re-engagement messages via Meta-approved templates.

### Nigerian Bargaining Engine
When a customer haggles — *"abeg 6k for the oud na"* — Bizzy detects the negotiation and automatically calculates a counter-offer within the merchant's hidden price floor. The merchant never intervenes. The customer never sees the floor price.

```json
{
  "is_haggling": true,
  "intent_action": "negotiate",
  "parsed_items": ["Royal Oud 50ml"],
  "counter_offer": 7500,
  "assistant_reply": "Haha I feel you! Best I can do is ₦7,500 — that's already a great deal 🙏"
}
```

### Multilingual Support
Bizzy speaks the language of the market — English, Nigerian Pidgin, Yoruba, Igbo, and Hausa.

---

## 🏗️ Architecture

### How It Works

```
ONE Bizzy Engine · ONE Backend · Unlimited Merchants

Customer texts +234 801 000 1111 (Zara's number)
              ↓
Africa's Talking webhook fires to FastAPI
              ↓
Merchant number = PostgreSQL lookup key
              ↓
Zara's profile, catalog, prices loaded as context
              ↓
Intent filter → Gemini 2.5 Flash pipeline
              ↓
Structured JSON output generated
              ↓
Africa's Talking sends reply as Zara's business
              ↓
Transaction saved · Merchant alerted on personal WhatsApp
```

### The Two-Layer AI Pipeline

**Layer 1 — Rule-Based Intent Filter**  
Lightweight string classifier runs on every message before any AI processing. Greetings, emojis, and one-word replies get instant template responses. Zero LLM cost. Eliminates 65-70% of API calls.

**Layer 2 — Gemini 2.5 Flash**  
Business-relevant messages pass to Gemini with the merchant's full context loaded as the system prompt. Returns strictly structured JSON — never free text. Handles Nigerian Pidgin slang, intent classification, price negotiation, and product matching.

### Tech Stack

| Layer | Technology |
|---|---|
| AI / LLM | Gemini 2.5 Flash (Google AI Studio) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + Alembic migrations |
| Session Store | Redis |
| Image Storage | Cloudinary |
| Messaging BSP | Africa's Talking (WhatsApp Business API) |
| Dashboard | Next.js (React) |
| Deployment | Render |
| Version Control | GitHub |

---

## 📁 Repository Structure

```
bizzy/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── webhooks.py       # Webhook receiver + routing
│   ├── core/
│   │   ├── filter.py             # Rule-based intent filter
│   │   ├── gemini.py             # Gemini AI pipeline
│   │   └── prompts.py            # System prompts + bargaining engine
│   └── db/
│       └── models.py             # PostgreSQL models (SQLAlchemy)
├── controllers/                  # Dashboard API controllers (Node.js)
├── middlewares/                  # Auth middleware
├── models/                       # Dashboard data models
├── routes/                       # Dashboard API routes
├── services/                     # Business logic services
├── .gitignore
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
```
POST /api/v1/auth/login       → Send OTP to merchant WhatsApp
POST /api/v1/auth/verify      → Verify OTP → returns JWT token
```

### Merchant
```
GET  /api/v1/merchant/profile → Get merchant profile
PUT  /api/v1/merchant/profile → Update merchant profile
```

### Products
```
GET    /api/v1/products                    → Get all products
POST   /api/v1/products                    → Add product
PUT    /api/v1/products/{id}               → Update product
DELETE /api/v1/products/{id}               → Soft delete product
PATCH  /api/v1/products/bulk               → Bulk update prices/stock
```

### Orders & Analytics
```
GET  /api/v1/sales-ledger                  → Full transaction history
GET  /api/v1/bargains/active               → Live active negotiations
GET  /api/v1/analytics/summary             → Dashboard summary cards
GET  /api/v1/analytics/revenue             → Revenue chart data
```

### Webhook
```
GET  /api/v1/webhook          → Africa's Talking verification
POST /api/v1/webhook          → Receive incoming WhatsApp messages
```

**Base URL:** `https://bizzy-engine.onrender.com/api/v1`

---

## 🚀 Getting Started

### Prerequisites
```
Python 3.11+
Node.js 18+
PostgreSQL 15+
Redis 7+
```

### Environment Variables
```env
# Gemini AI
GEMINI_API_KEY=

# Africa's Talking (WhatsApp BSP)
AT_API_KEY=
AT_USERNAME=

# Database
POSTGRES_URL=
POSTGRES_USER=bizzy
POSTGRES_PASSWORD=
POSTGRES_DB_NAME=bizzy_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Auth
JWT_SECRET_KEY=
WEBHOOK_VERIFY_TOKEN=

# Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Installation

**Backend (FastAPI)**
```bash
git clone https://github.com/Goodie323/bizzy.git
cd bizzy
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Dashboard (Next.js)**
```bash
cd dashboard
npm install
npm run dev
```

### Test the Webhook
```bash
curl -X POST "http://localhost:8000/api/v1/webhook" \
  -H "Content-Type: application/json" \
  -d "@payload.json"
```

---

## 🗺️ Merchant Onboarding Flow

```
1. Merchant visits Bizzy registration page
2. Enters dedicated business SIM number
3. Bizzy registers number on WhatsApp Business API via Africa's Talking
4. Meta sends OTP to merchant's SIM
5. Merchant enters OTP → number goes live
6. Bizzy sends WhatsApp welcome message to merchant's personal number
7. Merchant sets up store conversationally on WhatsApp:
   → Business name, greeting, language, payment details
   → Uploads products via image + description
   → Gemini AI extracts structured product data automatically
8. Store is live — Bizzy handles everything 24/7
```

---

## 💰 Business Model

| Plan | Price | Features |
|---|---|---|
| Starter | ₦2,500/month | 200 conversations · Basic catalog · Receipts |
| Growth | ₦6,000/month | Unlimited conversations · Full suite · Analytics |
| Pro | ₦15,000/month | Everything + multi-staff · Priority support · API access |

**Target Market:** 39 million Nigerian SMEs  
**Addressable Revenue:** ₦136M+/month at 0.1% market penetration

---

## 🌍 Why Nigeria · Why WhatsApp · Why Now

- WhatsApp has 93%+ smartphone penetration in Nigeria
- 39 million SMEs contribute 48% of Nigeria's GDP
- Less than 2% use any form of digital business management
- The average Nigerian market trader cannot afford or learn enterprise software
- Bizzy meets them exactly where they are — on WhatsApp, in their language

---

## 👥 Team

**Goodness Awoleye** — Founder & Team Lead  
B.Eng Mechatronics Engineering · Graduate Member, Nigerian Society of Engineers  
Lagos, Nigeria

**Backend / AI Engineer** — FastAPI · Gemini AI pipeline · PostgreSQL  

**Isaac** — Frontend Engineer · Next.js merchant dashboard

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **Live API:** https://bizzy-engine.onrender.com
- **Dashboard:** Coming soon
- **XPRIZE Submission:** devpost.com
- **Contact:** hello@bizzy.ng

---

*Bizzy — The invisible backbone of African commerce.*