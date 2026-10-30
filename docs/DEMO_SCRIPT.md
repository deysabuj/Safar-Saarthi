# Safar Saarthi — 5-to-10 Minute Demonstration Script

This script is structured for live product presentations, academic project vivas, and technical portfolio walk-throughs.

---

## Demonstration Overview
- **Product**: Safar Saarthi (Autonomous Multi-Modal Travel & AI Planner for India)
- **Target Audience**: Technical evaluators, professors, interviewers, and product leaders
- **Duration**: 7–10 Minutes
- **Prerequisites**: Services running locally via `docker compose up -d` or `npm run dev`.

---

## Act 1: The Problem & Vision (Minute 0:00 – 1:30)

> **Speaker**:  
> *"Good morning/afternoon. Today, planning a journey across India is fragmented and deceptive. If you want to travel from Delhi to Jaipur or Mumbai to Goa, you have to open one app for IRCTC trains, another for flights, and a third for intercity buses. Worse, standard booking portals hide the true out-of-pocket costs — like ₹800 cab rides to remote airports or 2-hour check-in lines.*  
>  
> *We built **Safar Saarthi** — India's autonomous multi-modal travel intelligence and itinerary platform. It unites Indian Railways, domestic air routes, and intercity buses into a deterministic comparative engine, backed by a 5-agent AI coordination network that builds feasible, hour-by-hour day itineraries."*

---

## Act 2: Landing Page & Search (Minute 1:30 – 3:00)

**Action on Screen**: Open `http://localhost:5173`.
1. **Show Brand & Inputs**:
   > *"Notice our intuitive interface. Travelers specify origin, destination, travel dates, passenger count, and estimated budget. We also highlight popular corridors like the Delhi-to-Jaipur 'Weekend Getaway'. Let's click it."*
2. **Demonstrate Input Validation**:
   > *"If a user accidentally types 'Mumbai' to 'Mumbai', our system provides immediate validation: 'Origin and destination cannot be identical.' Let's run a search for Delhi to Jaipur for 2 travelers."*

---

## Act 3: Multi-Modal Transport Matrix (Minute 3:00 – 5:00)

**Action on Screen**: Route Search Comparison view.
1. **Comparative Sorting Badges**:
   > *"Here is the multi-modal comparison grid. Safar Saarthi displays Flights, Trains, and Buses side by side. Our deterministic ranking engine categorizes them into:
   > - **Cheapest**: The overnight electric sleeper bus at ₹544.
   > - **Fastest**: IndiGo flight taking 60 minutes.
   > - **Best Value**: The Vande Bharat Express chair car at ₹1,050."*
2. **Full Cost Accounting**:
   > *"Notice the pricing breakdown. We don't just show base tickets; we compute taxes, luggage charges, and first-mile/last-mile cab estimates so travelers compare the true door-to-door cost."*
3. **External Booking Modal**:
   > *"When a traveler clicks 'Book on IRCTC' or 'Book on Airline', Safar Saarthi opens a verified redirection modal with transparent partner attribution and sanitizes all URLs to protect against phishing or open redirects."*

---

## Act 4: Multi-Agent AI Itinerary Synthesis (Minute 5:00 – 7:00)

**Action on Screen**: Click "Build Itinerary" on the Vande Bharat option.
1. **The 5-Agent Pipeline**:
   > *"When we click 'Build Itinerary', our Python FastAPI multi-agent backend activates:
   > 1. The **Trip Coordinator** initializes the context.
   > 2. The **Accommodation Agent** selects a verified stay (Hotel Diggi Palace) based on proximity to the railway junction.
   > 3. The **Activities Agent** curates destination sights like Amber Fort and City Palace.
   > 4. The **Itinerary Planning Agent** sequences them chronologically, enforcing a mandatory 45-minute transit exit buffer and operating hours.
   > 5. The **Budget Agent** calculates the grand total against the user's budget."*
2. **Interactive Map & Timeline**:
   > *"Travelers see an interactive map with linear routes, an anti-backtracking guarantee, and an editable timeline where deleting or adding activities instantly recalculates the deterministic budget."*

---

## Act 5: User Accounts, Saved Trips & Architecture (Minute 7:00 – 8:30)

**Action on Screen**: Navigate to "Saved Trips" tab.
1. **Saved Trips & Duplication**:
   > *"Travelers can save their plans or click 'Duplicate and customize trip' to create a variant with zero data loss."*
2. **System Architecture & Testing**:
   > *"Under the hood:
   > - **Backend**: Node.js, Express, TypeScript, and Prisma ORM on PostgreSQL 16.
   > - **AI Service**: Python 3.11 with FastAPI and Pydantic v2.
   > - **Testing**: 137 passing Vitest tests, 22 passing Pytest tests, and 9 Playwright E2E browser tests in automated CI.
   > - **Deployment**: Fully dockerized with multi-stage builds, non-root users, health probes, and structured JSON logs."*

---

## Act 6: Conclusion & Viva Q&A Transition (Minute 8:30 – 9:00)

> **Speaker**:  
> *"To summarize: Safar Saarthi proves that autonomous AI agents and deterministic engineering can solve complex, real-world transportation challenges in India while preserving user privacy and transparency. Thank you, and I am now happy to take any questions."*
