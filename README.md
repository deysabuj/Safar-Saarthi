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

- **Multi-Modal Transport Comparison:** Explore and compare flights, trains and buses.
- **AI-Powered Travel Planning:** Specialized AI agents coordinate different aspects of trip planning.
- **Smart Itinerary Generation:** Generate personalized travel itineraries based on user preferences and constraints.
- **Accommodation Discovery:** Explore accommodation options for destinations.
- **Destination Exploration:** Discover attractions and places of interest.
- **Budget Planning:** Compare indicative travel costs and organize trip budgets.
- **City Autocomplete:** Search destinations using city names, airport codes and railway station identifiers.
- **Modify Search:** Update travel searches without restarting the entire planning process.
- **Responsive Interface:** Designed for desktop and mobile experiences.

> **Data Transparency:** Transport demonstration benchmarks are indicative estimates, not confirmed live schedules, fares or seat availability. Real-time transport availability depends on configured and authorized third-party provider integrations.

## 🤖 Multi-Agent Architecture

Safar Saarthi uses a multi-agent approach to coordinate different travel planning tasks.

The system is designed around specialized agents:

| Agent | Responsibility |
|---|---|
| Travel Agent | Analyzes transportation and travel options |
| Accommodation Agent | Explores suitable accommodation |
| Activities Agent | Recommends attractions and activities |
| Itinerary Agent | Organizes personalized travel itineraries |
| Coordinator Agent | Coordinates specialized agents and combines their outputs |

## 🛠️ Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM

### AI Service
- Python 3.11
- FastAPI
- Multi-Agent Architecture

### Database & Infrastructure
- PostgreSQL 16
- Redis 7
- BullMQ
- Docker
- Docker Compose

### Testing & Validation
- TypeScript
- Unit and Integration Testing
- Playwright
- End-to-End Testing

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
├── frontend/              # React frontend application
│
├── backend/               # Node.js backend and API
│   ├── prisma/             # Database schema and migrations
│   └── src/
│       ├── integrations/   # External transport integrations
│       ├── providers/      # Travel data providers
│       └── tests/          # Backend tests
│
├── ai-service/             # Python FastAPI AI service
│
├── packages/
│   └── shared/             # Shared types, utilities and benchmarks
│
├── docker-compose.yml      # Production container configuration
├── docker-compose.dev.yml # Development container configuration
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
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

### 2. Navigate to the project

```bash
cd safar-saarthi
```

### 3. Configure environment variables

Create the required environment files using the provided `.env.example` templates.

Configure the necessary database, Redis, backend, AI service and provider settings.

Never commit actual API keys, passwords or secret credentials.

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

Live transport integrations require valid provider credentials and authorized API access.

Depending on the integrations enabled, configure:

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `IRCTC_API_KEY`
- `REDBUS_API_KEY`
- `GEMINI_API_KEY`

Refer to `.env.example` and the relevant service configuration for the complete environment variable requirements.

Without configured live provider access, the application may use demonstration benchmark data where supported.

## 🧪 Testing

Run the following commands from the project root:

```bash
npm run typecheck
npm run build
```

Run backend tests:

```bash
npm run test --workspace=backend
```

Run the Playwright end-to-end test suite:

```bash
npx playwright test
```

Run AI service tests using the test commands configured in the `ai-service` directory.

## 🚀 Deployment

The project supports containerized deployment using Docker Compose.

For a production deployment, configure:

- Production environment variables and API credentials.
- Hosted PostgreSQL and Redis services.
- Frontend and backend service URLs.
- CORS and authentication settings.
- HTTPS and a custom domain.
- Database migrations and persistent storage.

Live transport availability depends on the external providers and their API access policies.

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

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

<p align="center">
  **Safar Saarthi**
  <br/>
  Plan Smarter. Travel Better. Explore Further.
</p>
