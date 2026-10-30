# Safar Saarthi — Data-Flow Diagrams (DFD)

This document specifies the Data-Flow Diagrams (DFD) for the Safar Saarthi platform, illustrating how travel queries, credentials, provider telemetry, and synthesized itineraries flow through the system.

---

## 1. DFD Level 0 — Context Diagram

```mermaid
flowchart TD
    Traveler["Traveler / User"]
    SafarSaarthi["0.0<br>Safar Saarthi Multi-Agent System"]
    AirlineAPIs["External Airline Providers<br>(Amadeus / Air India / IndiGo)"]
    RailwayAPIs["External Rail Gateways<br>(IRCTC / CRIS Networks)"]
    BusAPIs["External Bus Aggregators<br>(RedBus / State RTCs)"]
    PlacesStayAPIs["Accommodations & Places<br>(MakeMyTrip / Zostel / OSM)"]
    LLMProvider["LLM Reasoning Engine<br>(Gemini / OpenAI)"]

    Traveler -->|1. Travel Query (Origin, Dest, Dates, Travelers, Budget)| SafarSaarthi
    Traveler -->|2. Authentication & Preferences (Pace, Style, Dietary)| SafarSaarthi

    SafarSaarthi -->|3. Flight Search Request (Origin, Dest, DepDate)| AirlineAPIs
    AirlineAPIs -->|4. Flight Tariffs & Schedules| SafarSaarthi

    SafarSaarthi -->|5. Train Timetable & Route Query| RailwayAPIs
    RailwayAPIs -->|6. Train Availability & Fares| SafarSaarthi

    SafarSaarthi -->|7. Intercity Bus Query| BusAPIs
    BusAPIs -->|8. Bus Schedules & Boarding Points| SafarSaarthi

    SafarSaarthi -->|9. Destination & Hub Coordinates| PlacesStayAPIs
    PlacesStayAPIs -->|10. Hotel Options & Verified Monuments| SafarSaarthi

    SafarSaarthi -->|11. Synthesize Itinerary Context & Constraints| LLMProvider
    LLMProvider -->|12. Reasoning & Recommendations| SafarSaarthi

    SafarSaarthi -->|13. Unified Comparison (Cheapest, Fastest, Best-Value)| Traveler
    SafarSaarthi -->|14. Day-Wise Feasible AI Itinerary + Map Routes| Traveler
    SafarSaarthi -->|15. Verified Deep-Link Redirection to Official Portals| Traveler
```

---

## 2. DFD Level 1 — Detailed Subsystem Decomposition

```mermaid
flowchart LR
    Traveler["Traveler"]

    subgraph "Process 1.0: Query Intake & Identity"
        P1["1.0<br>Intake & Validate Search Query"]
        D1[("Users & Search History")]
    end

    subgraph "Process 2.0: Multi-Modal Transport Orchestration"
        P2_1["2.1<br>Concurrent Provider Dispatch"]
        P2_2["2.2<br>Normalize & Deduplicate Offers"]
        P2_3["2.3<br>Deterministic Ranking Engine"]
        D2[("Transport Offers Store")]
    end

    subgraph "Process 3.0: Multi-Agent AI Synthesis"
        P3_1["3.1<br>Coordinator & Context Assembly"]
        P3_2["3.2<br>Accommodation & Activities Agent"]
        P3_3["3.3<br>Itinerary Chronology & Spatial Sequencer"]
        P3_4["3.4<br>Budget Deficit & Constraint Validator"]
        D3[("Itineraries & Places DB")]
    end

    subgraph "Process 4.0: Booking Redirection & Verification"
        P4["4.0<br>Sanitize & Verify Deep Links"]
    end

    Traveler -->|Submit Origin, Dest, Dates| P1
    P1 -->|Log Search & Auth Session| D1
    P1 -->|Dispatched Validated Query| P2_1

    P2_1 -->|Fetch External Telemetry| P2_2
    P2_2 -->|Save Normalized Offers| D2
    P2_2 -->|Feed Comparative Matrix| P2_3
    P2_3 -->|Return Ranked Matrix| Traveler

    P2_3 -->|Pass Selected Transport| P3_1
    P3_1 -->|Query Stays & Monuments| P3_2
    P3_2 -->|Build Schedule Slots| P3_3
    P3_3 -->|Check Feasibility & Budget| P3_4
    P3_4 -->|Store Final Verified Plan| D3
    D3 -->|Render Timeline & Map| Traveler

    Traveler -->|Click Book on Provider| P4
    P4 -->|Redirect to Official Portal| Traveler
```
