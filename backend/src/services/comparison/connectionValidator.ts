import { JourneyLeg, JourneyConnection, TravelMode } from '@safar-saarthi/shared';

export interface ConnectionValidationResult {
  isValid: boolean;
  connections: JourneyConnection[];
  totalLayoverMinutes: number;
  totalInterchangeCostInr: number;
  rejectionReason?: string;
}

export class ConnectionValidator {
  /**
   * Minimum required transfer times (in minutes) based on hub proximity and modes
   */
  static getMinimumTransferMinutes(
    leg1Mode: TravelMode,
    leg2Mode: TravelMode,
    fromHub: string,
    toHub: string
  ): { minMinutes: number; estimatedCostInr: number; description: string } {
    const isSameHub = fromHub.trim().toUpperCase() === toHub.trim().toUpperCase();

    // 1. Same Hub Transfers
    if (isSameHub) {
      if (leg1Mode === 'FLIGHT' && leg2Mode === 'FLIGHT') {
        return { minMinutes: 45, estimatedCostInr: 0, description: 'Same airport intra-terminal connection' };
      }
      if (leg1Mode === 'TRAIN' && leg2Mode === 'TRAIN') {
        return { minMinutes: 20, estimatedCostInr: 0, description: 'Same railway station platform connection' };
      }
      if (leg1Mode === 'BUS' && leg2Mode === 'BUS') {
        return { minMinutes: 30, estimatedCostInr: 0, description: 'Same bus terminal bay transfer' };
      }
      return { minMinutes: 45, estimatedCostInr: 0, description: 'Same hub interchange' };
    }

    // 2. Inter-terminal Airport Transfers (e.g., T1 to T3)
    const isAirportTransfer =
      (fromHub.includes('DEL') && toHub.includes('DEL')) ||
      (fromHub.includes('BOM') && toHub.includes('BOM'));
    if (isAirportTransfer) {
      return { minMinutes: 75, estimatedCostInr: 150, description: 'Airport inter-terminal shuttle / taxi transfer' };
    }

    // 3. Inter-station Railway Transfers (e.g., NDLS to DLI, or CSMT to BDTS)
    const isRailwayStationTransfer =
      (fromHub.includes('NDLS') && toHub.includes('DLI')) ||
      (fromHub.includes('DLI') && toHub.includes('NDLS')) ||
      (fromHub.includes('CSMT') && toHub.includes('BDTS')) ||
      (fromHub.includes('HWH') && toHub.includes('SDAH'));
    if (isRailwayStationTransfer) {
      return { minMinutes: 90, estimatedCostInr: 200, description: 'City transit between separate railway junctions' };
    }

    // 4. Multi-modal Inter-hub Transfers (e.g., Train Station to Airport, Bus Terminal to Railway Station)
    if (leg1Mode !== leg2Mode) {
      return { minMinutes: 120, estimatedCostInr: 450, description: 'Multi-modal city cab transfer between distinct travel hubs' };
    }

    // Default inter-hub in same metropolitan region
    return { minMinutes: 90, estimatedCostInr: 300, description: 'Inter-hub city transit' };
  }

  /**
   * Validates chronological sequence, connection feasibility, and calculates interchange costs for multi-leg journeys.
   */
  static validate(legs: JourneyLeg[]): ConnectionValidationResult {
    if (!legs || legs.length <= 1) {
      return {
        isValid: true,
        connections: [],
        totalLayoverMinutes: 0,
        totalInterchangeCostInr: 0,
      };
    }

    const connections: JourneyConnection[] = [];
    let totalLayoverMinutes = 0;
    let totalInterchangeCostInr = 0;

    for (let i = 0; i < legs.length - 1; i++) {
      const leg1 = legs[i];
      const leg2 = legs[i + 1];

      const arrTime1 = new Date(leg1.arrivalTime).getTime();
      const depTime2 = new Date(leg2.departureTime).getTime();

      // Check chronological order (Negative layover is an impossible connection!)
      if (isNaN(arrTime1) || isNaN(depTime2) || depTime2 <= arrTime1) {
        return {
          isValid: false,
          connections: [],
          totalLayoverMinutes: 0,
          totalInterchangeCostInr: 0,
          rejectionReason: `Chronological violation: Leg ${i + 2} departs at ${leg2.departureTime} before Leg ${i + 1} arrives at ${leg1.arrivalTime}.`,
        };
      }

      const layoverMinutes = Math.round((depTime2 - arrTime1) / (1000 * 60));
      totalLayoverMinutes += layoverMinutes;

      const rule = ConnectionValidator.getMinimumTransferMinutes(
        leg1.mode,
        leg2.mode,
        leg1.destinationHub,
        leg2.originHub
      );

      const isSameHub = leg1.destinationHub.trim().toUpperCase() === leg2.originHub.trim().toUpperCase();
      const isTerminalChange = !isSameHub && (leg1.mode === 'FLIGHT' || leg2.mode === 'FLIGHT');
      const isStationChange = !isSameHub && (leg1.mode === 'TRAIN' || leg2.mode === 'TRAIN');

      let isValidConnection = true;
      let validationIssue: string | undefined;

      if (layoverMinutes < rule.minMinutes) {
        isValidConnection = false;
        validationIssue = `Insufficient transfer time: ${layoverMinutes} mins available, but ${rule.minMinutes} mins minimum required for ${rule.description}.`;
      } else if (layoverMinutes > 1440) {
        // Excessive layover (> 24 hours) without overnight stopover confirmation
        isValidConnection = false;
        validationIssue = `Excessive layover: ${Math.round(layoverMinutes / 60)} hours exceeds maximum single-ticket transit threshold.`;
      }

      totalInterchangeCostInr += rule.estimatedCostInr;

      connections.push({
        fromHub: leg1.destinationHub,
        toHub: leg2.originHub,
        layoverMinutes,
        interchangeCostInr: rule.estimatedCostInr,
        isTerminalChange,
        isStationChange,
        isValidConnection,
        validationIssue,
      });

      if (!isValidConnection) {
        return {
          isValid: false,
          connections,
          totalLayoverMinutes,
          totalInterchangeCostInr,
          rejectionReason: validationIssue,
        };
      }
    }

    return {
      isValid: true,
      connections,
      totalLayoverMinutes,
      totalInterchangeCostInr,
    };
  }
}
