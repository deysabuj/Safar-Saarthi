import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AgentRunStatus } from '@prisma/client';
import { AppError } from '../errors/AppError.js';

export interface PlanTripAiInput {
  tripId?: string;
  query: {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string;
    travelers?: number;
    budget_inr?: number;
    preferred_modes?: string[];
    style?: string;
    pace?: string;
    dietary?: string;
    interests?: string[];
    user_prompt?: string;
  };
  transport_candidates?: Array<Record<string, unknown>>;
}

export class AiService {
  /**
   * Invokes the Safar Saarthi Python multi-agent orchestration service at /api/v1/plan
   */
  static async planTrip(input: PlanTripAiInput) {
    const startTime = Date.now();
    const url = `${env.AI_SERVICE_URL}/api/v1/plan`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input.query,
          trip_id: input.tripId,
          transport_candidates: input.transport_candidates || [],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI service responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const durationMs = Date.now() - startTime;

      // Audit run in database if tripId is present
      if (input.tripId) {
        await prisma.agentRun.create({
          data: {
            tripId: input.tripId,
            agentName: 'TripCoordinatorAgent',
            status: AgentRunStatus.COMPLETED,
            inputPayload: input as any,
            outputPayload: result as any,
            durationMs,
            completedAt: new Date(),
          },
        }).catch((err) => {
          console.warn('[AiService] Failed to record agent run:', err);
        });
      }

      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      if (input.tripId) {
        await prisma.agentRun.create({
          data: {
            tripId: input.tripId,
            agentName: 'TripCoordinatorAgent',
            status: AgentRunStatus.FAILED,
            inputPayload: input as any,
            errorMessage: error.message || 'AI service call failed',
            durationMs,
            completedAt: new Date(),
          },
        }).catch(() => {});
      }

      throw AppError.internal(
        `Failed to communicate with multi-agent AI service: ${error.message || 'Unknown error'}`
      );
    }
  }
}
