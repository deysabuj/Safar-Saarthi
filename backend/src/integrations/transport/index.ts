import { defaultProviderRegistry } from './registry.js';
import { IrctcTrainAdapter } from './adapters/irctc.adapter.js';
import { IndigoFlightAdapter } from './adapters/indigo.adapter.js';
import { AirIndiaFlightAdapter } from './adapters/airIndia.adapter.js';
import { RedBusAdapter } from './adapters/redbus.adapter.js';
import { AmadeusFlightAdapter } from './adapters/amadeus.adapter.js';
import { TransportSearchOrchestrator } from './orchestrator.js';

// Auto-register core transport adapters in the singleton registry
defaultProviderRegistry.register(new IrctcTrainAdapter());
defaultProviderRegistry.register(new IndigoFlightAdapter());
defaultProviderRegistry.register(new AirIndiaFlightAdapter());
defaultProviderRegistry.register(new RedBusAdapter());
defaultProviderRegistry.register(new AmadeusFlightAdapter());

// Create default singleton orchestrator
export const defaultTransportOrchestrator = new TransportSearchOrchestrator({
  registry: defaultProviderRegistry,
});

export * from './types.js';
export * from './schemas.js';
export * from './errors.js';
export * from './registry.js';
export * from './normalizer.js';
export * from './orchestrator.js';
export * from './adapters/base.adapter.js';
export * from './adapters/irctc.adapter.js';
export * from './adapters/indigo.adapter.js';
export * from './adapters/airIndia.adapter.js';
export * from './adapters/redbus.adapter.js';
export * from './adapters/amadeus.adapter.js';
export * from './amadeus/client.js';
export * from './amadeus/types.js';
export * from './railway/client.js';
export * from './railway/types.js';
export * from './bus/client.js';
export * from './bus/types.js';
