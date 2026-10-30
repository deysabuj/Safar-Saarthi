import {
  CostComponentItem,
  ItemizedCostBreakdown,
  JourneyLeg,
  JourneyConnection,
} from '@safar-saarthi/shared';
import { NormalizedTransportOffer } from '../../integrations/transport/types.js';
import { defaultCurrencyConverter, CurrencyConverter } from './currencyConverter.js';

export interface CostCalculationInput {
  offer?: NormalizedTransportOffer;
  legs?: JourneyLeg[];
  connections?: JourneyConnection[];
  baggageFeeInr?: number;
  currency?: string;
  currencyConverter?: CurrencyConverter;
}

export class TotalCostCalculator {
  /**
   * Computes comprehensive door-to-door journey cost breakdown, itemizing every component
   * and explicitly detecting any missing cost data.
   */
  static calculate(input: CostCalculationInput): ItemizedCostBreakdown {
    const converter = input.currencyConverter || defaultCurrencyConverter;
    const components: CostComponentItem[] = [];
    const missingCostComponents: string[] = [];

    let rawBaseFare = 0;
    let rawMandatoryFees = 0;
    let rawCurrency = 'INR';
    let firstMileTransferInr = 0;
    let lastMileTransferInr = 0;
    let firstMileIsEstimated = true;
    let lastMileIsEstimated = true;
    let hasFirstMile = false;
    let hasLastMile = false;

    // 1. Single offer evaluation
    if (input.offer) {
      const o = input.offer;
      rawCurrency = o.price.currency || 'INR';
      rawBaseFare = o.price.baseFare;
      rawMandatoryFees = o.price.mandatoryTaxesAndFees;

      if (o.price.transferCostEstimate) {
        if (typeof o.price.transferCostEstimate.firstMileInr === 'number') {
          firstMileTransferInr = o.price.transferCostEstimate.firstMileInr;
          firstMileIsEstimated = o.price.transferCostEstimate.isEstimate;
          hasFirstMile = true;
        }
        if (typeof o.price.transferCostEstimate.lastMileInr === 'number') {
          lastMileTransferInr = o.price.transferCostEstimate.lastMileInr;
          lastMileIsEstimated = o.price.transferCostEstimate.isEstimate;
          hasLastMile = true;
        }
      }
    } else if (input.legs && input.legs.length > 0) {
      // 2. Multi-leg journey aggregation
      rawCurrency = 'INR';
      for (const leg of input.legs) {
        rawBaseFare += leg.baseFareInr;
        rawMandatoryFees += leg.mandatoryFeesInr;
      }
    }

    // Convert currencies if needed
    const convBase = converter.convertToInr(rawBaseFare, rawCurrency);
    const convFees = converter.convertToInr(rawMandatoryFees, rawCurrency);
    const baseFareInr = convBase.amountInInr;
    const mandatoryTaxesAndFeesInr = convFees.amountInInr;

    // Component: Base Fare
    components.push({
      id: 'comp-base-fare',
      category: 'BASE_FARE',
      label: 'Ticket Base Fare',
      amountInr: baseFareInr,
      isMandatory: true,
      isEstimated: false,
      notes: rawCurrency !== 'INR' ? `Converted from ${rawCurrency} at rate ₹${convBase.exchangeRate}` : undefined,
    });

    // Component: Mandatory Taxes & Fees
    components.push({
      id: 'comp-mandatory-fees',
      category: 'MANDATORY_FEES',
      label: 'Mandatory Taxes, Airport & Surcharges',
      amountInr: mandatoryTaxesAndFeesInr,
      isMandatory: true,
      isEstimated: false,
    });

    // Component: Baggage Fees
    const baggageFeesInr = input.baggageFeeInr ?? 0;
    if (baggageFeesInr > 0) {
      components.push({
        id: 'comp-baggage',
        category: 'BAGGAGE',
        label: 'Mandatory Baggage Allowance Fees',
        amountInr: baggageFeesInr,
        isMandatory: true,
        isEstimated: false,
      });
    }

    // Component: First-Mile Origin Transfer
    if (hasFirstMile) {
      components.push({
        id: 'comp-first-mile',
        category: 'FIRST_MILE',
        label: 'First-Mile Origin Transfer',
        amountInr: firstMileTransferInr,
        isMandatory: true,
        isEstimated: firstMileIsEstimated,
        notes: firstMileIsEstimated ? 'Estimated local taxi / metro transfer to departure hub' : 'Fixed transfer quote',
      });
    } else {
      missingCostComponents.push('Origin hub first-mile transfer estimate');
    }

    // Component: Interchange Connection Costs (Multi-leg)
    let interchangeCostsInr = 0;
    if (input.connections && input.connections.length > 0) {
      for (let i = 0; i < input.connections.length; i++) {
        const conn = input.connections[i];
        if (conn.interchangeCostInr > 0) {
          interchangeCostsInr += conn.interchangeCostInr;
          components.push({
            id: `comp-interchange-${i + 1}`,
            category: 'INTERCHANGE',
            label: `Interchange Transfer (${conn.fromHub} -> ${conn.toHub})`,
            amountInr: conn.interchangeCostInr,
            isMandatory: true,
            isEstimated: true,
            notes: `Transfer cost for ${conn.layoverMinutes}m connection`,
          });
        }
      }
    }

    // Component: Last-Mile Destination Transfer
    if (hasLastMile) {
      components.push({
        id: 'comp-last-mile',
        category: 'LAST_MILE',
        label: 'Last-Mile Destination Transfer',
        amountInr: lastMileTransferInr,
        isMandatory: true,
        isEstimated: lastMileIsEstimated,
        notes: lastMileIsEstimated ? 'Estimated local taxi / auto transfer from arrival hub to city' : 'Fixed transfer quote',
      });
    } else {
      missingCostComponents.push('Destination hub last-mile transfer estimate');
    }

    const totalJourneyCostInr =
      baseFareInr +
      mandatoryTaxesAndFeesInr +
      baggageFeesInr +
      firstMileTransferInr +
      interchangeCostsInr +
      lastMileTransferInr;

    return {
      baseFareInr,
      mandatoryTaxesAndFeesInr,
      baggageFeesInr,
      firstMileTransferInr,
      interchangeCostsInr,
      lastMileTransferInr,
      otherExpensesInr: 0,
      totalJourneyCostInr,
      currency: 'INR',
      currencyExchangeRate: convBase.exchangeRate !== 1.0 ? convBase.exchangeRate : undefined,
      currencyExchangeTimestamp: convBase.exchangeRate !== 1.0 ? convBase.rateTimestamp : undefined,
      hasMissingCostComponents: missingCostComponents.length > 0,
      missingCostComponents,
      components,
    };
  }
}
