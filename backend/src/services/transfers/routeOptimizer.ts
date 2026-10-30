import { GroundTransferService, Coordinates } from './groundTransferService.js';
import { PlaceItem } from '../../providers/places/types.js';

export interface OptimizedDailyRoute {
  orderedPlaces: PlaceItem[];
  totalDistanceKm: number;
  totalTransferMinutes: number;
  backtrackingAvoided: boolean;
  explanation: string;
}

export class RouteOptimizer {
  /**
   * Optimizes the daily activity visit order to avoid zig-zag backtracking across the city.
   * Uses Nearest Neighbor heuristic starting from base location (accommodation or previous place).
   */
  static optimizeDailySequence(
    startLocation: { name: string; coordinates: Coordinates },
    places: PlaceItem[]
  ): OptimizedDailyRoute {
    if (places.length <= 1) {
      return {
        orderedPlaces: [...places],
        totalDistanceKm: 0,
        totalTransferMinutes: 0,
        backtrackingAvoided: false,
        explanation: 'Single activity; direct route.',
      };
    }

    // 1. Calculate natural sequence distance
    let unoptimizedDistance = 0;
    let curr = startLocation.coordinates;
    for (const p of places) {
      unoptimizedDistance += GroundTransferService.calculateHaversineDistanceKm(curr, {
        latitude: p.latitude,
        longitude: p.longitude,
      });
      curr = { latitude: p.latitude, longitude: p.longitude };
    }

    // 2. Greedy Nearest Neighbor sequencing to minimize total distance & prevent backtracking
    const remaining = [...places];
    const ordered: PlaceItem[] = [];
    let currentCoords = startLocation.coordinates;
    let optimizedDistance = 0;
    let totalTransferMinutes = 0;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = GroundTransferService.calculateHaversineDistanceKm(currentCoords, {
          latitude: remaining[i].latitude,
          longitude: remaining[i].longitude,
        });
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nextPlace = remaining.splice(nearestIdx, 1)[0];
      const transfer = GroundTransferService.estimateTransfer(
        'Previous Stop',
        nextPlace.title,
        currentCoords,
        { latitude: nextPlace.latitude, longitude: nextPlace.longitude }
      );

      ordered.push(nextPlace);
      optimizedDistance += transfer.distanceKm;
      totalTransferMinutes += transfer.estimatedDurationMinutes;
      currentCoords = { latitude: nextPlace.latitude, longitude: nextPlace.longitude };
    }

    const savedKm = Math.max(0, Math.round((unoptimizedDistance * 1.35 - optimizedDistance) * 10) / 10);
    const backtrackingAvoided = savedKm > 1.5;

    return {
      orderedPlaces: ordered,
      totalDistanceKm: Math.round(optimizedDistance * 10) / 10,
      totalTransferMinutes,
      backtrackingAvoided,
      explanation: backtrackingAvoided
        ? `Anti-backtracking active: Ordered stops sequentially along corridor to eliminate ${savedKm} km of redundant transit.`
        : 'Stops ordered along natural transit corridor.',
    };
  }
}
