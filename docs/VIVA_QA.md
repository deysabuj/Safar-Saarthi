# Safar Saarthi — Comprehensive Viva Questions & Answers

This document prepares project authors for technical interviews, academic defense vivas, and architectural design reviews.

---

## Category 1: System Architecture & Design Choices

### Q1: Why did you choose a hybrid architecture with Node.js/TypeScript and Python/FastAPI rather than building everything in a single language?
**Answer**:
> *"We adhered to the principle of choosing the right tool for each specialized domain:
> 1. **Node.js/Express with TypeScript** excels as an API Gateway and I/O-bound orchestrator. It handles concurrent HTTP requests, database transactions with Prisma, JWT authentication, and strict type-sharing with the React frontend via our monorepo `@safar-saarthi/shared` package.
> 2. **Python with FastAPI and Pydantic v2** is the premier ecosystem for AI agent orchestration and LLM integrations. It offers native async support, strict data validation with Pydantic, and rich tooling for LLM providers (Google Gemini, OpenAI).
> Isolating the AI coordinator into an autonomous microservice also ensures that long-running LLM inferences never block the Node.js event loop or degrade database query response times."*

### Q2: Why rely on a deterministic ranking engine rather than asking an LLM to compare transport prices?
**Answer**:
> *"LLMs are probabilistic token predictors, not deterministic arithmetic calculators. Asking an LLM to calculate door-to-door fares or evaluate currency conversions introduces non-determinism, hallucinations, and potential financial inaccuracy.  
> In Safar Saarthi, transport ranking (`CHEAPEST`, `FASTEST`, `BEST_VALUE`) is calculated deterministically in TypeScript using verified numeric formulas (ticket price + mandatory taxes + first/last mile cab transfers). The LLM is used strictly where it excels: semantic interpretation of traveler preferences, cultural nuances, and descriptive travel narratives."*

---

## Category 2: Transport Integration & Resilience

### Q3: How does the system handle an upstream provider outage (e.g. IRCTC API goes down)?
**Answer**:
> *"We implemented a **fault-isolated concurrent search orchestrator** utilizing `Promise.allSettled`. When a user initiates a multi-modal search:
> 1. Adapters for flights, trains, and buses are executed concurrently.
> 2. If the railway provider throws an HTTP 503 error or exceeds our bounded timeout (e.g. 4 seconds), that specific adapter fails gracefully and logs a structured error.
> 3. The orchestrator continues to aggregate and return valid offers from the healthy flight and bus providers.
> One failing provider never causes a total search failure."*

### Q4: How do you prevent open-redirect vulnerabilities when sending users to external booking sites?
**Answer**:
> *"We implemented strict URL validation in `Security.validateBookingUrl()`:
> 1. The URL must parse with a valid `https:` protocol.
> 2. The hostname is checked against an immutable domain allowlist containing only verified official partners (`irctc.co.in`, `airindia.com`, `goindigo.in`, `redbus.in`, `makemytrip.com`, etc.).
> 3. We guard against subdomain spoofing (e.g. `irctc.co.in.attacker.org` is strictly rejected).
> 4. All sensitive query parameters like `token`, `auth`, and `secret` are stripped before client redirection."*

---

## Category 3: Database & Security

### Q5: How do you secure user passwords and tokens?
**Answer**:
> *"1. Passwords are hashed using Node.js `crypto.scrypt` with a unique 16-byte cryptographically secure random salt per user. Verification uses `crypto.timingSafeEqual` to prevent side-channel timing attacks.  
> 2. Authentication tokens use HMAC-SHA256 signed JWTs with expiration timestamps. Verification decodes the header and payload and computes the signature in constant time.  
> 3. We enforce strict data ownership: queries filter by `userId`, ensuring users can never read, modify, or delete another traveler's private saved trips."*

### Q6: How does the system enforce anti-backtracking and spatial feasibility in itineraries?
**Answer**:
> *"The itinerary service uses the Haversine formula to compute great-circle geographical distances between consecutive latitude and longitude coordinates. If visiting Activity A -> Activity B -> Activity C travels significantly farther than moving directly from A to C, the system detects a spatial backtracking loop and flags the route for corridor reordering. We also enforce a mandatory 45-minute exit and cab transfer buffer after long-distance transit arrival before any sightseeing activity is scheduled."*

---

## Category 4: DevOps & Production Deployment

### Q7: Explain your Docker multi-stage build strategy and why it matters.
**Answer**:
> *"In both our backend and frontend Dockerfiles, we use multi-stage builds:
> - **Builder Stage**: Uses `node:20-alpine` with build dependencies (Python, make, g++), installs all devDependencies, and compiles TypeScript into clean JavaScript.
> - **Runner Stage**: Starts from a fresh, minimal Alpine image. It copies only compiled JavaScript (`dist/`) and production dependencies (`npm ci --omit=dev`), creating a lightweight container image (<150MB).
> - **Security**: The runner creates a non-root system user (`safaruser`) to execute the Node.js process, preventing root privilege escalation vulnerabilities."*

### Q8: What automated checks run in your CI/CD pipeline?
**Answer**:
> *"Our GitHub Actions workflow executes 6 parallel and sequential stages:
> 1. Static TypeScript type checking across all monorepo packages.
> 2. Backend Vitest suite (140 tests) against a live PostgreSQL 16 container.
> 3. AI Service Pytest suite (22 tests) validating agent logic.
> 4. Frontend Vite production build verification.
> 5. Playwright headless Chromium E2E suite verifying the real user flow.
> 6. Docker container image build tests for backend, AI service, and frontend."*
