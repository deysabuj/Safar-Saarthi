import { TransferEstimate } from '@safar-saarthi/shared';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GroundTransferService {
  private static readonly DISCLAIMER =
    'Transfer times and costs are estimates based on standard urban traffic conditions and subject to real-time changes.';

  /**
   * Calculates Great-Circle distance using Haversine formula in kilometers.
   */
  static calculateHaversineDistanceKm(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Estimates ground transfer metrics (distance, duration, fare, mode) with realistic Indian urban speeds.
   */
  static estimateTransfer(
    fromLocation: string,
    toLocation: string,
    fromCoords?: Coordinates,
    toCoords?: Coordinates,
    preferredMode?: 'CAB_TRANSFER' | 'AUTO_RICKSHAW' | 'WALK' | 'METRO'
  ): TransferEstimate {
    // If coordinates are missing, provide a safe nominal city transfer
    if (!fromCoords || !toCoords) {
      return {
        fromLocation,
        toLocation,
        mode: preferredMode || 'CAB_TRANSFER',
        distanceKm: 5.0,
        estimatedDurationMinutes: 25,
        estimatedCostInr: 150,
        isEstimated: true,
        disclaimer: GroundTransferService.DISCLAIMER,
      };
    }

    // Great circle distance with 1.35x winding tortuosity factor for street grids
    const straightKm = GroundTransferService.calculateHaversineDistanceKm(fromCoords, toCoords);
    const roadKm = Math.max(0.3, Math.round(straightKm * 1.35 * 10) / 10);

    let mode: 'CAB_TRANSFER' | 'AUTO_RICKSHAW' | 'WALK' | 'METRO';
    let speedKmh: number;
    let baseFare: number;
    let perKmRate: number;

    if (preferredMode) {
      mode = preferredMode;
      speedKmh = mode === 'WALK' ? 4.5 : mode === 'AUTO_RICKSHAW' ? 18 : mode === 'METRO' ? 32 : 22;
      baseFare = mode === 'WALK' ? 0 : mode === 'AUTO_RICKSHAW' ? 30 : mode === 'METRO' ? 20 : 60;
      perKmRate = mode === 'WALK' ? 0 : mode === 'AUTO_RICKSHAW' ? 15 : mode === 'METRO' ? 5 : 20;
    } else if (roadKm <= 1.0) {
      mode = 'WALK';
      speedKmh = 4.5;
      baseFare = 0;
      perKmRate = 0;
    } else if (roadKm <= 6.0) {
      mode = 'AUTO_RICKSHAW';
      speedKmh = 18;
      baseFare = 30;
      perKmRate = 15;
    } else {
      mode = 'CAB_TRANSFER';
      speedKmh = 22;
      baseFare = 60;
      perKmRate = 20;
    }

    const transitMinutes = Math.round((roadKm / speedKmh) * 60);
    // Add 5 min buffer for waiting/hailing/traffic lights
    const estimatedDurationMinutes = mode === 'WALK' ? Math.max(5, transitMinutes) : Math.max(10, transitMinutes + 5);

    const estimatedCostInr = mode === 'WALK' ? 0 : Math.round(baseFare + Math.max(0, roadKm - 1.5) * perKmRate);

    return {
      fromLocation,
      toLocation,
      fromCoordinates: fromCoords,
      toCoordinates: toCoords,
      mode,
      distanceKm: roadKm,
      estimatedDurationMinutes,
      estimatedCostInr,
      isEstimated: true,
      disclaimer: GroundTransferService.DISCLAIMER,
    };
  }
}
