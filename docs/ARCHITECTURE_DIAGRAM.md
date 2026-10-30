# Safar Saarthi — System Architecture Diagram

Safar Saarthi is architected as an autonomous multi-tier, multi-agent travel intelligence system engineered specifically for the complexity of Indian transportation and tourism.

```mermaid
graph TD
    subgraph "Client Layer (Frontend SPA)"
        Browser["User Web / Mobile Browser"]
        Vite["Vite React 19 SPA (Port 5173 / 80)"]
        UI_Components["TailwindCSS + Lucide Icons<br>Transport Matrix | Interactive Map | AI Timeline"]
        Client_State["Traveler Persona & Session State<br>Auth Context | Local Cache"]
        Browser --> Vite
        Vite --> UI_Components
        Vite --> Client_State
    end

    subgraph "Edge / Proxy Layer"
        Nginx["Nginx Reverse Proxy & Static Server<br>Gzip | SPA Fallback | Security Headers"]
        Vite -.-> Nginx
    end

    subgraph "Application Gateway Layer (Backend Core)"
        API_Gateway["Node.js Express TypeScript (Port 5000)<br>CORS | Rate Limiter | Structured Logger"]
        Auth_Middleware["Authentication & Authorization<br>Scrypt Passwords | HMAC-SHA256 JWT"]
        Validation_Pipe["Zod Strict Request Validation & Sanitization"]

        subgraph "Domain Controllers & Services"
            Trip_Ctrl["Trip & Search Controller"]
            Transport_Ctrl["Transport Comparison Controller"]
            Itinerary_Ctrl["Itinerary & Activity Controller"]
            User_Ctrl["User Accounts & Saved Trips Controller"]
            
            Comparison_Engine["Smart Ranking Engine<br>Cheapest | Fastest | Best-Value"]
            Connection_Val["Connection & Layover Validator<br>Min. Buffer | Anti-Backtracking"]
            Cost_Model["Total Cost Calculator<br>Ticket + Taxes + First/Last Mile Cab"]
        end

        API_Gateway --> Auth_Middleware
        Auth_Middleware --> Validation_Pipe
        Validation_Pipe --> Trip_Ctrl
        Validation_Pipe --> Transport_Ctrl
        Validation_Pipe --> Itinerary_Ctrl
        Validation_Pipe --> User_Ctrl

        Transport_Ctrl --> Comparison_Engine
        Comparison_Engine --> Connection_Val
        Comparison_Engine --> Cost_Model
    end

    subgraph "Transport Orchestration Layer"
        Search_Orchestrator["Transport Search Orchestrator<br>Promise.allSettled Concurrency | Bounded Retries"]
        Provider_Registry["Dynamic Provider Registry<br>Enable / Disable / Health Checks"]
        Normalizer["Offer Normalizer & Deduplication Service"]

        Search_Orchestrator --> Provider_Registry
        Search_Orchestrator --> Normalizer

        subgraph "Provider Adapters"
            Amadeus_Adapter["Amadeus Flight Adapter<br>OAuth2 Client-Credentials | Offers v2"]
            IRCTC_Adapter["IRCTC Rail Adapter<br>PNR Status | Timetable | Tatkal Benchmarks"]
            RedBus_Adapter["RedBus & State RTC Bus Adapter<br>Intercity Fares | Boarding Points"]
        end

        Search_Orchestrator --> Amadeus_Adapter
        Search_Orchestrator --> IRCTC_Adapter
        Search_Orchestrator --> RedBus_Adapter
    end

    subgraph "AI Multi-Agent Specialist Service"
        FastAPI_Core["FastAPI Python 3.11 Service (Port 8000)<br>Pydantic v2 Models | Async Engine"]
        Coordinator["Trip Coordinator Agent"]
        Transport_Agent["Transport Recommendation Agent"]
        Stay_Agent["Accommodation Agent"]
        Activity_Agent["Activities & Culture Agent"]
        Itinerary_Agent["Itinerary Planning Agent"]
        Budget_Agent["Budget & Constraint Validation Agent"]

        FastAPI_Core --> Coordinator
        Coordinator --> Transport_Agent
        Coordinator --> Stay_Agent
        Coordinator --> Activity_Agent
        Coordinator --> Itinerary_Agent
        Coordinator --> Budget_Agent
    end

    subgraph "Data & Persistence Layer"
        Prisma_ORM["Prisma 6 Client"]
        Postgres[("PostgreSQL 16 Relational DB<br>Users | Trips | Offers | Itineraries | Places")]
        Redis_Cache[("Redis 7 In-Memory Cache<br>Rate Limits | Search Cache | Session State")]

        Trip_Ctrl --> Prisma_ORM
        Itinerary_Ctrl --> Prisma_ORM
        User_Ctrl --> Prisma_ORM
        Prisma_ORM --> Postgres
        API_Gateway --> Redis_Cache
    end

    subgraph "External Providers & Upstream Networks"
        Ext_Amadeus["Amadeus for Developers API"]
        Ext_IRCTC["Official IRCTC / CRIS Network"]
        Ext_RedBus["RedBus / State RTCs (KSRTC, UPSRTC, RSRTC)"]
        Ext_LLM["Google Gemini / OpenAI LLM"]

        Amadeus_Adapter -->|HTTPS / OAuth2| Ext_Amadeus
        IRCTC_Adapter -->|HTTPS REST| Ext_IRCTC
        RedBus_Adapter -->|HTTPS REST| Ext_RedBus
        FastAPI_Core -->|REST / API Key| Ext_LLM
    end

    %% Inter-service connections
    Trip_Ctrl --> Search_Orchestrator
    Itinerary_Ctrl -->|HTTP JSON /api/v1/plan| FastAPI_Core
