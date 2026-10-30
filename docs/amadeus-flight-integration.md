# Amadeus for Developers — Flight Search Integration & Evaluation

This document details the architectural evaluation, technical capabilities, commercial terms, operational constraints, and activation workflow for the **Amadeus for Developers** Flight Search integration in Safar Saarthi.

---

## 1. Technical Evaluation & API Capabilities

Amadeus for Developers provides standardized REST access to Global Distribution System (GDS) flight content via OAuth 2.0 Client Credentials:

- **Core Endpoint**: `GET /v2/shopping/flight-offers` (and `POST` for multi-criteria complex search).
- **Protocol**: HTTPS / JSON with OAuth2 bearer token authentication (`POST /v1/security/oauth2/token`).
- **Token Lifecycle**: Bearer tokens are valid for 1,799 seconds (~30 minutes). Safar Saarthi implements automatic token caching with a 60-second safety renewal window and deduplication of concurrent authentication calls.
- **Search Capabilities**:
  - Origin & Destination using standard 3-letter IATA airport codes (e.g. `DEL`, `BOM`, `BLR`, `JAI`, `GOI`).
  - Single-leg one-way journeys and return itineraries.
  - Passenger counts (adults, children, infants) with itemized `travelerPricings`.
  - Native currency conversion into Indian Rupees (`currencyCode=INR`).
  - Filtering by cabin class (`ECONOMY`, `PREMIUM_ECONOMY`, `BUSINESS`, `FIRST`) and non-stop flags.
- **Data Extracted into Safar Saarthi**:
  - Carrier codes, marketing/operating flight numbers, and aircraft models (e.g., Airbus A320neo, Boeing 777-300ER).
  - Segment breakdown: Departure/arrival local timestamps with timezone offsets, terminal assignments, and layover stops.
  - Price structure: Base fare, government passenger service fees (UDF/PSF), and total grand cost.
  - Baggage allowances: Checked bag weight (e.g. 15 KG) or piece count.
  - Bookable seat availability counts (`numberOfBookableSeats`).

---

## 2. Test vs. Production Limitations & Commercial Terms

| Dimension | Test Environment (`test.api.amadeus.com`) | Production Environment (`api.amadeus.com`) |
|---|---|---|
| **Access Model** | Free Self-Service registration | Self-Service Pay-As-You-Go or Enterprise contract |
| **Monthly Free Quota** | **2,000 free requests / month** | 2,000 free requests / month, then billable |
| **Cost Beyond Free Quota**| Blocked (HTTP 429 / Quota Exceeded) | ~€0.002 to €0.005 per transaction (~₹0.18–₹0.45) |
| **Rate Limit** | 10 transactions per second (TPS) | Configurable up to enterprise SLA tiers |
| **Inventory Freshness** | Simulated GDS historical snapshot | Live airline reservations and fare classes |
| **Indian Carrier Coverage** | Full-service GDS airlines (Air India, Vistara, international carriers) are well represented. Low-cost carriers (IndiGo, SpiceJet, Akasa Air) may have limited inventory without direct airline NDC link. | Full GDS + opt-in airline NDC content. |

---

## 3. Booking Capability & Provider Attribution Rules

> [!IMPORTANT]
> **No Direct Booking Fabrication Guarantee**:
> Amadeus Self-Service offers shopping and order creation endpoints, but does **not** generate direct consumer one-click checkout links for all third-party airline websites.
> - Safar Saarthi strictly routes consumers to verified official airline reservation portals (e.g., `https://www.airindia.com` or `https://www.goindigo.in`) using documented carrier reference numbers.
> - Offers derived from live Amadeus GDS calls are labeled **`Live Price`** (`LIVE`) with attribution notes indicating GDS source.
> - When credentials are unconfigured, the system reports **`Unconfigured`** status and never presents fabricated demo fares as live airline inventory.

---

## 4. How to Enable Amadeus Live Search

### Step 1: Create an Amadeus for Developers Account
1. Visit [Amadeus for Developers Portal](https://developers.amadeus.com/).
2. Sign up for a free account.
3. In your dashboard, click **Create New App** (e.g. `Safar-Saarthi-Dev`).
4. Copy your **API Key** (`Client ID`) and **API Secret** (`Client Secret`).

### Step 2: Configure Environment Variables
Open `backend/.env` (or set environment variables on your deployment server):

```bash
AMADEUS_CLIENT_ID="your_amadeus_api_key_here"
AMADEUS_CLIENT_SECRET="your_amadeus_api_secret_here"
AMADEUS_ENV="test"  # Use "production" once activated with credit card
```

### Step 3: Verify Integration
Restart the backend or run the live integration test:
```bash
npm run test --workspace=safar-saarthi-backend -- -t "Amadeus Live Integration"
```
Once configured, the `AmadeusFlightAdapter` will automatically execute live flight searches alongside IRCTC and bus providers.
