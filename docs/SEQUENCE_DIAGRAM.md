# Safar Saarthi — Sequence Diagram (Multi-Modal Search & Itinerary)

The following sequence diagram details the end-to-end interactions between the Traveler, Frontend React SPA, Backend API Gateway, Transport Search Orchestrator, Provider Adapters, PostgreSQL, and the AI Multi-Agent Specialist Service.

```mermaid
sequenceDiagram
    autonumber
    actor Traveler
    participant Frontend as Frontend SPA (Vite/React)
    participant Gateway as Backend Gateway (Express)
    participant DB as PostgreSQL 16 (Prisma)
    participant Orchestrator as Search Orchestrator
    participant Adapters as Provider Adapters (Amadeus/IRCTC/RedBus)
    participant AIService as AI Multi-Agent Service (FastAPI)

    %% Step 1: Search Initiation
    Traveler->>Frontend: Enter Origin ("Delhi"), Destination ("Jaipur"), Dates, Travelers
    Frontend->>Frontend: Client-Side Input Validation (Origin != Destination, Budget > 0)
    Frontend->>Gateway: POST /api/v1/trips/search (Payload: query, token)

    %% Step 2: Gateway Intake & Persistence
    activate Gateway
    Gateway->>Gateway: Authenticate JWT (optional for guest, required for private save)
    Gateway->>DB: INSERT into Trip (origin, destination, dates, travelers, status="SEARCHING")
    DB-->>Gateway: Return tripId

    %% Step 3: Concurrent Multi-Modal Transport Dispatch
    Gateway->>Orchestrator: search(query, tripId)
    activate Orchestrator
    par Parallel Provider Queries
        Orchestrator->>Adapters: Amadeus Flight Offers Search v2 (HTTP / OAuth2)
        Adapters-->>Orchestrator: Normalized Flight Offers
    and
        Orchestrator->>Adapters: IRCTC Railway Schedules & Fares (HTTP REST)
        Adapters-->>Orchestrator: Normalized Train Offers
    and
        Orchestrator->>Adapters: RedBus / State RTC Fares & Depots (HTTP REST)
        Adapters-->>Orchestrator: Normalized Bus Offers
    end

    %% Step 4: Normalization & Deterministic Ranking
    Orchestrator->>Orchestrator: Deduplicate by Natural Key
    Orchestrator->>Orchestrator: Compute Door-to-Door Cost (Ticket + Taxes + Cab Transfers)
    Orchestrator->>Orchestrator: Assign Categories (CHEAPEST, FASTEST, BEST_VALUE)
    Orchestrator->>DB: Upsert Normalized Offers into transport_offers
    Orchestrator-->>Gateway: Return SearchAggregationResult (offers, error meta)
    deactivate Orchestrator

    Gateway-->>Frontend: 200 OK (tripId, ranked transport options)
    deactivate Gateway
    Frontend->>Traveler: Render Transport Comparison Matrix with Badges

    %% Step 5: AI Itinerary Generation
    Traveler->>Frontend: Click "Build Itinerary" on Selected Option (e.g. Vande Bharat Express)
    Frontend->>Gateway: POST /api/v1/ai/generate-itinerary (tripId, transportOptionId, persona)
    activate Gateway

    Gateway->>AIService: POST /api/v1/plan (origin, destination, transportArrival, pace, budget)
    activate AIService
    AIService->>AIService: Trip Coordinator initializes Planning Context
    par Agent Subtasks
        AIService->>AIService: Accommodation Agent selects verified stay
    and
        AIService->>AIService: Activities Agent curates heritage sights & opening hours
    end
    AIService->>AIService: Itinerary Planner schedules day-wise slots with 45m transit buffer
    AIService->>AIService: Budget Agent checks deficit & generates savings tips
    AIService-->>Gateway: Return Synthesized ItineraryPlan JSON
    deactivate AIService

    Gateway->>DB: Persist ItineraryDays & ItineraryActivities
    Gateway-->>Frontend: 200 OK (ItineraryPlan, budget breakdown, map markers)
    deactivate Gateway

    Frontend->>Traveler: Render Day-Wise Timeline, Interactive Leaflet Map, & Budget Summary
```
