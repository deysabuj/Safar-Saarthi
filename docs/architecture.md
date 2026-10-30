# Safar Saarthi (सफ़र सारथी) — Architecture Document

## 1. System Overview
**Safar Saarthi** is an AI-powered multi-agent travel planning and transportation comparison platform designed specifically for the nuances of Indian transit (domestic flights, Indian Railways/IRCTC, and interstate buses).

The platform blends:
- **Deterministic logic**: For transit fares, schedule comparison, currency handling, date validation, and hard budget compliance.
- **Autonomous Multi-Agent AI**: For reasoning, contextual recommendations (neighborhoods, hidden gems, weather/season considerations), and customizable day-wise itineraries.
- **Provider Transparency**: Direct redirection with official provider attribution (IRCTC, MakeMyTrip, RedBus, IndiGo, etc.) without fabricating live fares or scraping protected portals.

---

## 2. Component Hierarchy & Responsibilities

```
                                  ┌────────────────────────┐
                                  │      Client (Web)      │
                                  │   React 19 + Tailwind  │
                                  └───────────┬────────────┘
                                              │ HTTP / JSON
                                              ▼
                                  ┌────────────────────────┐
                                  │   Core API (Backend)   │
                                  │ Express + TypeScript   │
                                  └─────┬────────────┬─────┘
                     Internal RPC/HTTP  │            │  Prisma ORM
                                        ▼            ▼
                             ┌─────────────────┐ ┌──────────────┐
                             │    AI Engine    │ │  PostgreSQL  │
                             │ Python FastAPI  │ │   Database   │
                             └────────┬────────┘ └──────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
   │ Transport Agent │       │  Stay & Explore │       │ Budget & Policy │
   │ (Train/Air/Bus) │       │ (Hotel/Activity)│       │ Validator Agent │
   └─────────────────┘       └─────────────────┘       └─────────────────┘
```

### 2.1 Services & Packages

| Component | Technology | Responsibilities |
|---|---|---|
| **`frontend/`** | React 19, Vite, Tailwind CSS, Lucide Icons | Responsive UI, route comparison matrix, multi-modal filters, itinerary timeline, transparent provider booking redirect modal. |
| **`backend/`** | Node.js, Express, TypeScript, Prisma, Zod | API Gateway, transport aggregators, deterministic cost calculation, authentication, trip persistence, audit logging of booking clicks. |
| **`ai-service/`** | Python 3.13, FastAPI, Pydantic v2 | Specialist agent orchestration (Transport, Accommodation, Activities, Itinerary, Budget Validator), prompt engineering, LLM interfaces. |
| **`packages/shared/`** | TypeScript | Shared data contracts, enums (`TravelMode`, `BookingProvider`), and validation schemas across frontend and backend. |
| **`infra/`** | Docker Compose | Local and production deployment manifests for PostgreSQL 16 and Redis 7. |
| **`docs/`** | Markdown | System architecture, setup guides, API reference, and design decisions. |

---

## 3. Specialist Multi-Agent Architecture

The AI Service employs a **Coordinator-Agent pattern**:

1. **Transport Recommendation Agent**:
   - Evaluates multi-modal routes (e.g. Flight vs Train 3AC vs Sleeper Bus).
   - Considers travel time trade-offs, luggage allowances, and transit hub transfers (e.g., Delhi IGI vs New Delhi Railway Station).
2. **Accommodation Agent**:
   - Matches hotels/homestays to transit hubs and planned daily attractions.
   - Categorizes by traveler persona (Solo, Couple, Family, Backpacker).
3. **Activities & Attractions Agent**:
   - Curates destination highlights, cultural etiquette, opening days/times, and seasonal guidance.
4. **Itinerary Planning Agent**:
   - Synthesizes day-wise plans with geographically contiguous routing to avoid backtracking.
5. **Budget and Constraint Validation Agent**:
   - Executes deterministic calculations against user-specified budgets.
   - Flags budget overruns and proposes lower-cost alternatives (e.g., 3AC instead of Flight, off-peak departures).

---

## 4. Data Flow

### 4.1 Trip Search & Comparison Flow
1. User enters origin, destination, travel dates, passenger count, and optional budget into the React frontend.
2. Frontend submits search request to Backend (`POST /api/trips/search`).
3. Backend checks Redis cache for existing results within TTL.
4. On cache miss, Backend calls provider adapters (Flight, Train, Bus) and computes:
   - **Cheapest Option** (Lowest base fare + mandatory taxes/fees).
   - **Fastest Option** (Shortest door-to-door transit time).
   - **Best-Value Option** (Optimal balance between price and duration).
5. Results are returned to the user with attribution badges and booking links.

### 4.2 AI Itinerary Generation Flow
1. User requests an AI itinerary based on chosen transport and destination preferences.
2. Backend queries the Python AI Service (`POST /api/v1/itinerary/plan`).
3. The AI Coordinator invokes specialist sub-agents, gathers recommendations, and runs the deterministic Budget Validator.
4. Structured JSON response is validated via Pydantic schemas and returned to the Backend.
5. Backend persists the itinerary in PostgreSQL and streams or renders the day-wise timeline to the Frontend.

---

## 5. Security & Provider Integrity Principles
- **No Scraping**: No automated web scraping of CAPTCHA-protected booking engines. Integrations use approved APIs or direct URL deep-linking to official platforms (IRCTC Next Generation e-Ticketing, airline booking portals, state RTC portals).
- **Attribution & Transparency**: Every fare card displays provider origin, last-updated timestamp, and a clear label if sample demonstration data is rendered.
- **Server-Side Secrets**: All LLM API keys and database credentials reside exclusively on backend/AI service environments.
