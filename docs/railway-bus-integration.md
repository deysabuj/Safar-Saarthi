# Safar Saarthi — Railway and Intercity Bus Integration Specification

## 1. Executive Summary

This document specifies the technical architecture, regulatory constraints, commercial options, and adapter implementations for **Indian Railways (IRCTC)** and **Intercity Bus (RedBus / State RTCs)** integrations within the Safar Saarthi multimodal transport comparison platform.

---

## 2. Indian Railways Integration Analysis

### 2.1 Regulatory Framework & Access Landscape
In India, the **Centre for Railway Information Systems (CRIS)** and the **Indian Railway Catering and Tourism Corporation (IRCTC)** maintain exclusive statutory authority over passenger ticketing, reservation systems, and real-time inventory.

1. **IRCTC Corporate B2B (Principal Service Provider - PSP)**:
   - **Access Level**: Full e-ticketing, live PNR inquiries, real-time availability, and direct booking transactions.
   - **Requirements**:
     - Formal corporate agreement with IRCTC.
     - Security deposit / bank guarantee (typically ₹10 Lakhs to ₹25 Lakhs+).
     - Fixed static IP whitelisting with IPSec VPN tunnel directly into IRCTC servers.
     - Strict annual security compliance audits (CERT-In certified).
   - **Target Audience**: Large Online Travel Agencies (OTAs) such as MakeMyTrip, EaseMyTrip, ConfirmTkt, and RailYatri.

2. **Authorized Aggregator & B2B Sub-Agent APIs**:
   - **Access Level**: Train search between stations, live availability checks, fare inquiries, and outbound referral links.
   - **Providers**: Approved PSP aggregators (ConfirmTkt B2B, RailYatri, ixigo partner APIs, or RapidAPI IRCTC gateways).
   - **Requirements**: API key authentication, per-request billing, rate limits (typically 5–15 RPS).

3. **Public Timetable & Static Schedule Open Data**:
   - **Access Level**: Train schedules, station codes, routes, and fare structures via data.gov.in and CRIS NTES public portals.
   - **Limitations**: No live seat counts or dynamic waitlist predictions without authorized API keys.

### 2.2 Prohibited Practices & Compliance Rules
- **No Web Scraping**: Scraping `irctc.co.in` or using headless browsers to bypass CAPTCHA is strictly prohibited by IRCTC terms of service and Section 43/66 of the Information Technology Act, 2000.
- **Zero Railway Password Storage**: Safar Saarthi **never** collects, prompts for, or stores users' IRCTC account usernames, passwords, or transaction PINs.
- **Accurate Availability Disclosure**: Safar Saarthi never claims live seat availability unless an authorized API response explicitly confirms seat counts. When live data is not available, fares and schedules are clearly identified as benchmark timetable data (`DEMO`), and availability status is mapped to `UNKNOWN` or `AVAILABLE` based on verified sources.
- **Outbound Redirection**: When users choose a train option, Safar Saarthi deep-links them to the official IRCTC e-Ticketing portal (`https://www.irctc.co.in/nget/`) with pre-filled train numbers, travel dates, origin station, and destination station codes.

### 2.3 Supported Railway Capabilities

| Capability | Supported in Safar Saarthi | Mechanism |
|---|---|---|
| **Station Discovery & Resolution** | Yes | Automated Indian railway station resolver (`DEL/NDLS`, `BOM/CSMT`, `JP`, `BLR/SBC`, `CCU/HWH`, `MAA/MAS`, etc.) |
| **Train Timetable & Schedules** | Yes | Station-to-station schedule search with arrival/departure timestamps and transit duration |
| **Multi-Class Fare Breakdown** | Yes | Base fare, reservation fee, superfast charge, and catering fee across classes (`CC`, `EC`, `1A`, `2A`, `3A`, `3E`, `SL`, `2S`) |
| **Availability Status Mapping** | Yes | `AVAILABLE`, `WAITLIST` (WL), `RAC`, `SOLD_OUT` (Regret), and `UNKNOWN` |
| **Outbound Booking Redirection** | Yes | Verified deep links to official IRCTC portal with route parameters |
| **In-App Password Capture** | **PROHIBITED** | Never implemented per compliance rules |

---

## 3. Intercity Bus Integration Analysis

### 3.1 Aggregator Landscape in India
Intercity bus travel in India is fragmented across thousands of private fleet operators and dozens of State Road Transport Corporations (RTCs). Aggregators unify this inventory:

1. **RedBus (Ibibo Group)**:
   - **Coverage**: Largest network in India, connecting over 3,500 private bus operators (e.g., Zingbus, IntrCity SmartBus, VRL Travels, SRS Travels, Orange Travels, NueGo) and 26 State RTCs (KSRTC, RSRTC, UPSRTC, APSRTC, HRTC, TSRTC).
   - **API Features**: City lookup, available trips, seat layout, boarding/drop-off point schedules, amenities, live fares, and outbound booking URLs.
   - **Access**: RedBus Open API / B2B partner credentials (`REDBUS_API_KEY`, `REDBUS_API_URL`).

2. **AbhiBus / ixigo Bus**:
   - **Coverage**: Strong presence in South and Western India with direct RTC tie-ups.
   - **API Features**: REST endpoints for trip search, seat inventory, and affiliate booking tracking.

### 3.2 Bus Provider Requirements & Multi-Operator Support
- **Operator Independence**: The core search service does not hardcode operator schemas. It normalizes all bus results into the standard `NormalizedTransportOffer` contract.
- **Boarding & Drop-off Points**: Captures exact boarding hubs (e.g., *ISBT Kashmiri Gate, Delhi*) and drop-off hubs (e.g., *Sindhi Camp, Jaipur*) with precise timestamps.
- **Bus Types & Amenities**: Records bus class (`AC Sleeper (2+1)`, `Volvo Multi-Axle AC`, `Seater`, `Electric Bus`) and amenities (`hasChargingPoint`, `isSleeper`, `WiFi`, `Water bottle`).
- **Door-to-Door First/Last Mile Estimates**: Factors in auto-rickshaw/cab transfer costs to reach peripheral highway pickup points.
- **Fallback for Unsupported Routes**: When an uncommon corridor is queried without live bus inventory, Safar Saarthi gracefully communicates availability status or falls back to benchmark intercity routes.

---

## 4. Configuration & Activation Guide

### Environment Variables in `backend/.env`
```env
# Indian Railways (IRCTC / Authorized Gateway)
IRCTC_API_KEY="your_railway_api_key_here"
IRCTC_API_URL="https://irctc-indian-railway-pnr-status.p.rapidapi.com"
IRCTC_API_HOST="irctc-indian-railway-pnr-status.p.rapidapi.com"

# Intercity Bus (RedBus / Aggregator Gateway)
REDBUS_API_KEY="your_redbus_api_key_here"
REDBUS_API_URL="https://api.redbus.in/v1"
```

When credentials are not configured, both adapters operate in safe demonstration mode:
- Live API calls are omitted.
- Verified benchmark data is returned for supported corridors and explicitly labeled `dataSource.type = 'DEMO'` (`isDemonstration: true`).
- No synthetic live quotes are manufactured.
