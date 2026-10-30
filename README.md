# 🧭 Safar Saarthi — AI-Powered Multi-Agent Travel Planner

**Plan Smarter. Travel Better. Explore Further.**

Safar Saarthi is an AI-powered multi-agent travel planning platform designed to simplify trip planning by bringing transportation comparison, accommodation discovery, activity recommendations, budget planning and personalized itinerary generation into one place.

It coordinates specialized AI agents to help travelers explore suitable travel options based on their preferences, constraints and budget.

---

## 🌍 Overview

Planning a trip often requires switching between multiple platforms to compare transportation, find accommodation, research destinations and organize itineraries.

Safar Saarthi aims to simplify this process through an integrated travel planning experience.

Users can explore available travel options, compare flights, trains and buses, discover destinations, and generate personalized itineraries with the assistance of specialized AI agents.

## ✨ Key Features

- **Multi-Modal Transport Comparison:** Explore and compare flights, trains and buses side-by-side with deterministic `CHEAPEST`, `FASTEST`, and `BEST_VALUE` rankings.
- **AI-Powered Travel Planning:** 5 specialized AI agents coordinate different aspects of trip planning with anti-backtracking sightseeing sequences.
- **Smart Itinerary Generation:** Generate personalized, feasible day-wise travel itineraries based on user preferences and constraints.
- **Accommodation Discovery:** Explore accommodation options with hub proximity and verified traveler ratings.
- **Destination Exploration:** Discover attractions, monument operating hours, and insider local tips.
- **Budget Planning:** Compare door-to-door travel costs (including first/last-mile cab transfers) and organize trip budgets.
- **City Autocomplete:** Search destinations using city names, airport codes and railway station identifiers with accessible keyboard navigation.
- **Modify Search:** Update travel searches without restarting the entire planning process.
- **Responsive Interface:** Premium travel-tech brand identity designed for both desktop and mobile experiences.

> **Data Transparency:** Transport demonstration benchmarks are indicative estimates, not confirmed live schedules, fares or seat availability. Real-time transport availability depends on configured and authorized third-party provider integrations.

## 🤖 Multi-Agent Architecture

Safar Saarthi uses an autonomous 5-agent network to coordinate trip planning tasks:

| Agent | Responsibility |
|---|---|
| **Trip Coordinator Agent** | Interprets queries, validates mandatory constraints, and orchestrates the agent network |
| **Transport Recommendation Agent** | Contextualizes transit trade-offs between flight speed, rail comfort, and bus value |
| **Accommodation Agent** | Recommends verified stays based on transit hub proximity and traveler style |
| **Activities Agent** | Curates monuments, attractions, and cultural sights with operating hours |
| **Budget & Constraint Agent** | Enforces 45-min transit exit buffers, verifies budget variance, and identifies savings |

## 🛠️ Technology Stack

### Frontend
- React 19
- TypeScript
- Vite 6
- Tailwind CSS

### Backend
- Node.js 20+
- Express.js
- TypeScript
- Prisma ORM 6

### AI Service
- Python 3.11 / 3.13
- FastAPI
- Multi-Agent Orchestration (Mock / Gemini / OpenAI)

### Database & Infrastructure
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose
- Nginx (Alpine)

### Testing & Validation
- TypeScript (Strict type checking)
- Vitest (Unit & Integration tests)
- Pytest (AI Agent tests)
- Playwright (End-to-End browser tests)

## 🏗️ System Architecture

```text
                 SAFAR SAARTHI
                       |
          +------------+------------+
          |                         |
      Frontend                  Backend API
   React + TypeScript         Node.js + Express
                                    |
                +-------------------+------------------+
                |                   |                  |
            Transport            Database          AI Service
            Integrations        PostgreSQL          FastAPI
                |                   |                  |
        +-------+-------+           |          +-------+-------+
        |       |       |           |          |       |       |
      Flights Trains   Buses      Redis      Travel  Stay   Activities
                                                   |
                                             Itinerary Agent
```

## 📁 Project Structure

```text
safar-saarthi/
│
├── frontend/              # React 19 + Vite frontend application
│   ├── src/               # UI components, pages, contexts, services
│   └── vercel.json        # Frontend Vercel SPA configuration
│
├── backend/               # Node.js backend gateway and API
│   ├── prisma/            # Database schema and migrations
│   └── src/
│       ├── integrations/  # External transport provider adapters
│       ├── providers/     # Travel data providers & benchmarks
│       └── tests/         # Unit and integration test suites
│
├── ai-service/            # Python FastAPI AI multi-agent service
│   ├── app/               # 5-agent network, schemas, LLM providers
│   └── tests/             # Pytest suite
│
├── packages/
│   └── shared/            # Shared TypeScript types, utilities, benchmarks
│
├── e2e/                   # Playwright end-to-end tests
├── docs/                  # Architectural diagrams, viva QA, guides
├── docker-compose.yml     # Production container configuration
├── docker-compose.dev.yml # Development container configuration
├── vercel.json            # Monorepo root Vercel configuration
├── package.json
├── README.md
└── .gitignore
```

## ⚙️ Getting Started

### Prerequisites

Install the following before running the application:

- Node.js 20+
- npm
- Docker Desktop
- Docker Compose
- Git

### 1. Clone the repository

```bash
git clone https://github.com/deysabuj/safar-saarthi.git
```

### 2. Navigate to the project

```bash
cd safar-saarthi
```

### 3. Configure environment variables

Create the required environment files using the provided `.env.example` templates:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env
```

Configure the necessary database, Redis, backend, AI service and provider settings. Never commit actual API keys, passwords or secret credentials.

### 4. Install dependencies

```bash
npm install
```

### 5. Start the application using Docker

```bash
docker compose up --build -d
```

### 6. Access the application

| Service | Local URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| AI Service | http://localhost:8000 |

Check running containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f
```

Stop the application:

```bash
docker compose stop
```

## 🔑 External API Configuration

Live transport integrations require valid provider credentials and authorized API access:

- `AMADEUS_CLIENT_ID` & `AMADEUS_CLIENT_SECRET` (Flights)
- `IRCTC_API_KEY` (Indian Railways)
- `REDBUS_API_KEY` (Intercity Buses)
- `GEMINI_API_KEY` or `OPENAI_API_KEY` (AI Itinerary Generation)

Refer to `.env.example` and service-specific templates for complete environment configuration. Without configured live provider access, the application uses authentic demonstration benchmark data across 14 major Indian transport corridors.

## 🧪 Testing

Run static analysis and builds from the project root:

```bash
npm run typecheck
npm run build
```

Run backend test suite (181 passed):

```bash
npm run test --workspace=backend
```

Run Playwright end-to-end test suite (36 passed across Desktop & Mobile):

```bash
npx playwright test
```

Run AI service test suite (22 passed):

```bash
cd ai-service && pytest
```

## 🚀 Deployment

### Vercel (Frontend)
The frontend is configured for deployment on Vercel with automated workspace build ordering and client-side SPA routing:
- **Root Directory**: `./` (leave blank/root)
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build:frontend` (or default `vercel-build`)
- **Output Directory**: `frontend/dist`
- **Environment Variable**: `VITE_API_URL=https://<your-backend-api-domain>/api`

### Docker & Cloud (Backend, AI Service, Databases)
- Production containers are orchestrated via `docker-compose.yml`.
- Multi-stage Dockerfiles enforce non-root system execution (`safaruser` / `aiuser`) and built-in health probes (`/health`).

## 📚 Technical Documentation

Comprehensive architectural and project defense materials are available in [`docs/`](docs/):
- **[System Architecture Diagram](docs/ARCHITECTURE_DIAGRAM.md)**
- **[Entity-Relationship (ER) Diagram](docs/ER_DIAGRAM.md)**
- **[Data-Flow Diagrams (DFD Level 0 & Level 1)](docs/DATA_FLOW_DIAGRAM.md)**
- **[Multi-Modal Sequence Diagram](docs/SEQUENCE_DIAGRAM.md)**
- **[Use-Case Diagram](docs/USE_CASE_DIAGRAM.md)**
- **[Testing Results & Verification](docs/TESTING_RESULTS.md)**
- **[Backup & Disaster Recovery Runbook](docs/BACKUP_AND_RECOVERY.md)**
- **[Live Demonstration Script](docs/DEMO_SCRIPT.md)**
- **[Viva Questions & Answers](docs/VIVA_QA.md)**
- **[Resume Bullet Points](docs/RESUME_POINTS.md)**

## 🔮 Future Enhancements

- Broader real-time transportation integrations.
- More regional and international travel coverage.
- Advanced route optimization.
- Enhanced AI-powered recommendations.
- Personalized travel preferences.
- Improved price comparison and budget optimization.
- Additional travel booking integrations.

## 👨‍💻 Developer

**Sabuj Dey**

BCA Undergraduate | Full-Stack Developer | AI & Technology Enthusiast

Interested in building intelligent applications that solve real-world problems through software engineering and AI.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  **Safar Saarthi**
  <br/>
  Plan Smarter. Travel Better. Explore Further.
</p>
