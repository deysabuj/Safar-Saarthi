import { TripMapData, MapMarker, MapRouteLeg, ItineraryPlan, resolveLocation } from '@safar-saarthi/shared';

export class MapProjectionService {
  /**
   * Generates structured geospatial points, route legs, and view boundaries from an ItineraryPlan.
   */
  static buildMapData(plan: ItineraryPlan): TripMapData {
    const markers: MapMarker[] = [];
    const routeLegs: MapRouteLeg[] = [];

    // 1. Accommodation Marker
    const stay = plan.recommendedStay;
    const resolvedCity = resolveLocation(plan.destination);
    const defaultStayLat = resolvedCity?.coordinates.latitude || 28.6139;
    const defaultStayLng = resolvedCity?.coordinates.longitude || 77.209;
    const stayLat = stay.latitude || defaultStayLat;
    const stayLng = stay.longitude || defaultStayLng;

    const stayMarker: MapMarker = {
      id: `marker-stay-${stay.id}`,
      type: 'ACCOMMODATION',
      title: stay.name,
      description: `Curated stay in ${stay.neighborhood}. ₹${stay.pricePerNightInr.toLocaleString('en-IN')}/night.`,
      locationName: stay.neighborhood,
      latitude: stayLat,
      longitude: stayLng,
    };
    markers.push(stayMarker);

    // 2. Transport Arrival & Departure Markers
    const transport = plan.selectedTransport;
    if (transport) {
      const hubLat = defaultStayLat;
      const hubLng = defaultStayLng;

      markers.push({
        id: 'marker-transit-arrival',
        type: 'TRANSIT_ARRIVAL',
        title: `Arrival: ${transport.destinationHub}`,
        description: `${transport.operator} (${transport.identifier}) arriving at ${transport.arrivalTime}.`,
        locationName: transport.destinationHub,
        latitude: hubLat,
        longitude: hubLng,
        timeSlot: transport.arrivalTime,
      });
    }

    // 3. Activity Markers & Day Route Legs
    let sumLat = stayLat;
    let sumLng = stayLng;
    let totalPoints = 1;

    for (const day of plan.days) {
      let prevMarkerId = stayMarker.id;
      let prevName = stayMarker.title;

      for (let i = 0; i < day.activities.length; i++) {
        const act = day.activities[i];
        const lat = act.latitude || stayLat + (i * 0.008 - 0.004);
        const lng = act.longitude || stayLng + (i * 0.008 - 0.004);

        sumLat += lat;
        sumLng += lng;
        totalPoints++;

        const actMarkerId = `marker-act-${day.dayNumber}-${i}-${act.id}`;
        markers.push({
          id: actMarkerId,
          dayNumber: day.dayNumber,
          orderIndex: i + 1,
          type: act.category === 'FOOD' ? 'DINING' : 'ACTIVITY',
          title: act.title,
          description: act.description,
          locationName: act.location,
          latitude: lat,
          longitude: lng,
          timeSlot: act.timeSlot,
          category: act.category,
          requiresConfirmation: act.requiresConfirmation,
        });

        // Add Route Leg
        routeLegs.push({
          dayNumber: day.dayNumber,
          fromMarkerId: prevMarkerId,
          toMarkerId: actMarkerId,
          fromName: prevName,
          toName: act.title,
          distanceKm: act.transferFromPrevious?.distanceKm || 2.5,
          estimatedMinutes: act.transferFromPrevious?.estimatedDurationMinutes || 15,
          mode: act.transferFromPrevious?.mode || 'CAB_TRANSFER',
          isEstimated: true,
        });

        prevMarkerId = actMarkerId;
        prevName = act.title;
      }
    }

    const centerLat = Math.round((sumLat / totalPoints) * 10000) / 10000;
    const centerLng = Math.round((sumLng / totalPoints) * 10000) / 10000;

    return {
      tripId: plan.id,
      destination: plan.destination,
      center: { latitude: centerLat, longitude: centerLng },
      zoom: 12,
      markers,
      routeLegs,
      disclaimer:
        'Map markers and transit lines represent estimated city corridors. Real-time traffic, roadblocks, and local taxi tariffs can fluctuate.',
    };
  }
}
