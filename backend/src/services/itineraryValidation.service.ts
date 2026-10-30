import {
  ItineraryPlan,
  ItineraryDay,
  ItineraryValidationReport,
  ItineraryValidationIssue,
} from '@safar-saarthi/shared';
import { GroundTransferService } from './transfers/groundTransferService.js';

export class ItineraryValidationService {
  /**
   * Validates a complete itinerary plan against temporal, spatial, buffer, and verification constraints.
   */
  static validateItinerary(plan: ItineraryPlan): ItineraryValidationReport {
    const issues: ItineraryValidationIssue[] = [];
    let penaltyScore = 0;

    // 1. Validate Arrival Time Constraints
    const transport = plan.selectedTransport;
    const arrivalTimeStr = transport?.arrivalTime; // e.g. "09:50 AM" or "14:30" or ISO
    const departureTimeStr = transport?.departureTime;

    // Helper: convert "HH:MM AM/PM" or "HH:MM" to minutes from midnight
    const parseTimeToMinutes = (tStr?: string): number | null => {
      if (!tStr) return null;
      const clean = tStr.trim();
      const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return null;

      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3]?.toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const arrivalMinutes = parseTimeToMinutes(arrivalTimeStr);
    const day1 = plan.days[0];

    if (day1 && day1.activities.length > 0 && arrivalMinutes !== null) {
      const firstAct = day1.activities[0];
      const firstActStart = parseTimeToMinutes(firstAct.timeSlot.split('-')[0]);

      if (firstActStart !== null) {
        // Minimum 45 min buffer after arrival for station/airport exit and transit
        const minAllowedStart = arrivalMinutes + 45;
        if (firstActStart < minAllowedStart) {
          issues.push({
            severity: 'ERROR',
            dayNumber: 1,
            activityTitle: firstAct.title,
            code: 'TEMPORAL_OUT_OF_BOUNDS',
            message: `Activity '${firstAct.title}' is scheduled at ${firstAct.timeSlot.split('-')[0].trim()}, which is before traveler arrival time (${arrivalTimeStr}) plus the mandatory 45-minute transit buffer.`,
          });
          penaltyScore += 25;
        }
      }
    }

    // 2. Validate Return Departure Constraints (Last Day)
    const lastDay = plan.days[plan.days.length - 1];
    if (lastDay && lastDay.activities.length > 0 && departureTimeStr) {
      // If return transit is specified or estimated
      const returnDepMinutes = parseTimeToMinutes(departureTimeStr);
      if (returnDepMinutes !== null && plan.durationDays > 1) {
        const lastAct = lastDay.activities[lastDay.activities.length - 1];
        const lastActEnd = parseTimeToMinutes(lastAct.timeSlot.split('-')[1]);
        if (lastActEnd !== null) {
          // Required 90-120 min buffer before return journey
          const maxAllowedEnd = returnDepMinutes - 90;
          if (maxAllowedEnd > 0 && lastActEnd > maxAllowedEnd) {
            issues.push({
              severity: 'WARNING',
              dayNumber: lastDay.dayNumber,
              activityTitle: lastAct.title,
              code: 'TEMPORAL_OUT_OF_BOUNDS',
              message: `Activity '${lastAct.title}' ends at ${lastAct.timeSlot.split('-')[1].trim()}, leaving less than 90 minutes before return departure. Recommend concluding activities earlier to prevent missing transit.`,
            });
            penaltyScore += 15;
          }
        }
      }
    }

    // 3. Validate Consecutive Activity Buffers & Transfer Times
    let totalBufferDeficits = 0;
    for (const day of plan.days) {
      for (let i = 0; i < day.activities.length - 1; i++) {
        const actA = day.activities[i];
        const actB = day.activities[i + 1];

        const endA = parseTimeToMinutes(actA.timeSlot.split('-')[1]);
        const startB = parseTimeToMinutes(actB.timeSlot.split('-')[0]);

        if (endA !== null && startB !== null) {
          const gapMinutes = startB - endA;
          const transferMinutes = actB.transferFromPrevious?.estimatedDurationMinutes || 20;

          if (gapMinutes < transferMinutes) {
            issues.push({
              severity: 'WARNING',
              dayNumber: day.dayNumber,
              activityTitle: actB.title,
              code: 'INSUFFICIENT_BUFFER',
              message: `Only ${gapMinutes} minutes allowed between '${actA.title}' and '${actB.title}', but estimated ground transfer requires ${transferMinutes} minutes.`,
            });
            totalBufferDeficits++;
            penaltyScore += 8;
          }
        }
      }
    }

    // 4. Validate Operating Hours & Unverified Data Flags
    let unverifiedCount = 0;
    for (const day of plan.days) {
      for (const act of day.activities) {
        if (act.requiresConfirmation) {
          unverifiedCount++;
          issues.push({
            severity: 'INFO',
            dayNumber: day.dayNumber,
            activityTitle: act.title,
            code: 'UNVERIFIED_DATA',
            message: act.confirmationNote || `'${act.title}' operating hours or access requires confirmation before visiting.`,
          });
        }

        // Operating hours check
        if (act.openingHours && act.openingHours.includes('-')) {
          const actStart = parseTimeToMinutes(act.timeSlot.split('-')[0]);
          const actEnd = parseTimeToMinutes(act.timeSlot.split('-')[1]);
          const openStart = parseTimeToMinutes(act.openingHours.split('-')[0]);
          const openEnd = parseTimeToMinutes(act.openingHours.split('-')[1]);

          if (actStart !== null && openStart !== null && actStart < openStart) {
            issues.push({
              severity: 'WARNING',
              dayNumber: day.dayNumber,
              activityTitle: act.title,
              code: 'OPERATING_HOURS_MISMATCH',
              message: `'${act.title}' is scheduled to start at ${act.timeSlot.split('-')[0].trim()}, but official opening time is ${act.openingHours.split('-')[0].trim()}.`,
            });
            penaltyScore += 10;
          }

          if (actEnd !== null && openEnd !== null && actEnd > openEnd) {
            issues.push({
              severity: 'WARNING',
              dayNumber: day.dayNumber,
              activityTitle: act.title,
              code: 'OPERATING_HOURS_MISMATCH',
              message: `'${act.title}' extends to ${act.timeSlot.split('-')[1].trim()}, but official closing time is ${act.openingHours.split('-')[1].trim()}.`,
            });
            penaltyScore += 10;
          }
        }
      }
    }

    // 5. Anti-Backtracking Geographical Verification
    let backtrackingAlerts = 0;
    for (const day of plan.days) {
      if (day.activities.length >= 3) {
        for (let i = 0; i < day.activities.length - 2; i++) {
          const p1 = day.activities[i];
          const p2 = day.activities[i + 1];
          const p3 = day.activities[i + 2];

          if (p1.latitude && p2.latitude && p3.latitude) {
            const d12 = GroundTransferService.calculateHaversineDistanceKm(
              { latitude: p1.latitude, longitude: p1.longitude! },
              { latitude: p2.latitude, longitude: p2.longitude! }
            );
            const d23 = GroundTransferService.calculateHaversineDistanceKm(
              { latitude: p2.latitude, longitude: p2.longitude! },
              { latitude: p3.latitude, longitude: p3.longitude! }
            );
            const d13 = GroundTransferService.calculateHaversineDistanceKm(
              { latitude: p1.latitude, longitude: p1.longitude! },
              { latitude: p3.latitude, longitude: p3.longitude! }
            );

            // If going p1 -> p2 -> p3 travels significantly more than p1 -> p3 directly, backtracking detected
            if (d12 + d23 > 12.0 && d13 < 4.0) {
              backtrackingAlerts++;
              issues.push({
                severity: 'INFO',
                dayNumber: day.dayNumber,
                activityTitle: p2.title,
                code: 'BACKTRACKING_DETECTED',
                message: `Sequence from '${p1.title}' to '${p2.title}' and then back to '${p3.title}' creates a backtracking loop. Stops have been flagged for corridor reordering.`,
              });
              penaltyScore += 5;
            }
          }
        }
      }
    }

    const calculatedScore = Math.max(0, 100 - penaltyScore);
    const hasCriticalErrors = issues.some((i) => i.severity === 'ERROR');

    return {
      isValid: !hasCriticalErrors,
      score: calculatedScore,
      issues,
      antiBacktrackingSummary:
        backtrackingAlerts === 0
          ? 'Stops follow a linear spatial corridor with zero backtracking detected.'
          : `${backtrackingAlerts} backtracking loop(s) detected across daily routes.`,
      bufferSummary:
        totalBufferDeficits === 0
          ? 'All consecutive stops have sufficient travel and transfer buffers.'
          : `${totalBufferDeficits} stop(s) have tight transit buffers.`,
    };
  }
}
