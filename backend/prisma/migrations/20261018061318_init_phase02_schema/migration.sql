-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('FLIGHT', 'TRAIN', 'BUS', 'CAB_TRANSFER');

-- CreateEnum
CREATE TYPE "TransportCategory" AS ENUM ('CHEAPEST', 'FASTEST', 'BEST_VALUE');

-- CreateEnum
CREATE TYPE "OfferDataSource" AS ENUM ('LIVE', 'CACHED', 'DEMO');

-- CreateEnum
CREATE TYPE "ProviderCategory" AS ENUM ('RAIL', 'AIRLINE', 'BUS_OPERATOR', 'OTA_HOTEL', 'ACTIVITIES');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PLANNED', 'SAVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('HERITAGE_HAVELI', 'HOTEL', 'RESORT', 'BOUTIQUE_HOMESTAY', 'HOSTEL');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('HERITAGE', 'FOOD', 'NATURE', 'SHOPPING', 'CULTURE', 'RELAXATION');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILURE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProviderCategory" NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "travelers" INTEGER NOT NULL DEFAULT 1,
    "totalBudget" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_offers" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "providerId" TEXT NOT NULL,
    "mode" "TravelMode" NOT NULL,
    "category" "TransportCategory" NOT NULL,
    "operator" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "originHub" TEXT NOT NULL,
    "destinationHub" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "taxesAndFees" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "availableSeats" INTEGER,
    "seatClass" TEXT,
    "dataSource" "OfferDataSource" NOT NULL DEFAULT 'DEMO',
    "bookingUrl" TEXT NOT NULL,
    "firstMileCost" DECIMAL(10,2),
    "lastMileCost" DECIMAL(10,2),
    "transferNotes" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accommodation_options" (
    "id" TEXT NOT NULL,
    "providerId" TEXT,
    "destination" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccommodationType" NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "proximityToHub" TEXT NOT NULL,
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 4.5,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "amenities" TEXT[],
    "bookingUrl" TEXT NOT NULL,
    "isDemonstration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accommodation_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "entryFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "typicalDurationMinutes" INTEGER NOT NULL DEFAULT 90,
    "insiderTip" TEXT,
    "bestTimeToVisit" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "theme" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "dailyBudgetEstimate" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "localTransportTip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_activities" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "placeId" TEXT,
    "timeSlot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entryFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "category" "ActivityCategory" NOT NULL,
    "insiderTip" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_trips" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "travelers" INTEGER NOT NULL DEFAULT 1,
    "budget" DECIMAL(10,2),
    "preferredModes" "TravelMode"[],
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "userId" TEXT,
    "agentName" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sync_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "message" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE INDEX "trips_origin_destination_idx" ON "trips"("origin", "destination");

-- CreateIndex
CREATE INDEX "trips_userId_idx" ON "trips"("userId");

-- CreateIndex
CREATE INDEX "trips_departureDate_idx" ON "trips"("departureDate");

-- CreateIndex
CREATE INDEX "transport_offers_tripId_idx" ON "transport_offers"("tripId");

-- CreateIndex
CREATE INDEX "transport_offers_providerId_idx" ON "transport_offers"("providerId");

-- CreateIndex
CREATE INDEX "transport_offers_mode_idx" ON "transport_offers"("mode");

-- CreateIndex
CREATE INDEX "transport_offers_category_idx" ON "transport_offers"("category");

-- CreateIndex
CREATE INDEX "transport_offers_totalCost_idx" ON "transport_offers"("totalCost");

-- CreateIndex
CREATE INDEX "accommodation_options_destination_idx" ON "accommodation_options"("destination");

-- CreateIndex
CREATE INDEX "accommodation_options_pricePerNight_idx" ON "accommodation_options"("pricePerNight");

-- CreateIndex
CREATE INDEX "accommodation_options_rating_idx" ON "accommodation_options"("rating");

-- CreateIndex
CREATE INDEX "places_destination_idx" ON "places"("destination");

-- CreateIndex
CREATE INDEX "places_category_idx" ON "places"("category");

-- CreateIndex
CREATE INDEX "itinerary_days_tripId_dayNumber_idx" ON "itinerary_days"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "itinerary_activities_itineraryDayId_orderIndex_idx" ON "itinerary_activities"("itineraryDayId", "orderIndex");

-- CreateIndex
CREATE INDEX "saved_trips_userId_idx" ON "saved_trips"("userId");

-- CreateIndex
CREATE INDEX "saved_trips_tripId_idx" ON "saved_trips"("tripId");

-- CreateIndex
CREATE INDEX "search_histories_origin_destination_idx" ON "search_histories"("origin", "destination");

-- CreateIndex
CREATE INDEX "search_histories_userId_idx" ON "search_histories"("userId");

-- CreateIndex
CREATE INDEX "search_histories_searchedAt_idx" ON "search_histories"("searchedAt");

-- CreateIndex
CREATE INDEX "agent_runs_tripId_idx" ON "agent_runs"("tripId");

-- CreateIndex
CREATE INDEX "agent_runs_agentName_idx" ON "agent_runs"("agentName");

-- CreateIndex
CREATE INDEX "agent_runs_status_idx" ON "agent_runs"("status");

-- CreateIndex
CREATE INDEX "provider_sync_logs_providerId_idx" ON "provider_sync_logs"("providerId");

-- CreateIndex
CREATE INDEX "provider_sync_logs_status_idx" ON "provider_sync_logs"("status");

-- CreateIndex
CREATE INDEX "provider_sync_logs_syncedAt_idx" ON "provider_sync_logs"("syncedAt");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_offers" ADD CONSTRAINT "transport_offers_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_offers" ADD CONSTRAINT "transport_offers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_options" ADD CONSTRAINT "accommodation_options_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_activities" ADD CONSTRAINT "itinerary_activities_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_activities" ADD CONSTRAINT "itinerary_activities_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_trips" ADD CONSTRAINT "saved_trips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_trips" ADD CONSTRAINT "saved_trips_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_sync_logs" ADD CONSTRAINT "provider_sync_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
