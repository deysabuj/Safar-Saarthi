import { TravelMode } from '@safar-saarthi/shared';
import { TransportProvider } from './types.js';
import { Logger } from '../../utils/logger.js';

export class ProviderRegistry {
  private providers = new Map<string, TransportProvider>();
  private disabledProviders = new Set<string>();

  register(provider: TransportProvider): void {
    if (this.providers.has(provider.code)) {
      Logger.warn(`Overwriting registered provider '${provider.code}'`, 'PROVIDER_REGISTRY');
    }
    this.providers.set(provider.code, provider);
    Logger.info(
      `Registered provider '${provider.code}' (${provider.name}) for mode ${provider.mode}`,
      'PROVIDER_REGISTRY'
    );
  }

  unregister(providerCode: string): boolean {
    return this.providers.delete(providerCode);
  }

  get(providerCode: string): TransportProvider | undefined {
    return this.providers.get(providerCode);
  }

  has(providerCode: string): boolean {
    return this.providers.has(providerCode);
  }

  enable(providerCode: string): void {
    this.disabledProviders.delete(providerCode);
  }

  disable(providerCode: string): void {
    this.disabledProviders.add(providerCode);
  }

  isEnabled(providerCode: string): boolean {
    const provider = this.providers.get(providerCode);
    if (!provider || !provider.isEnabled) return false;
    return !this.disabledProviders.has(providerCode);
  }

  getAllActive(): TransportProvider[] {
    return Array.from(this.providers.values()).filter((p) => this.isEnabled(p.code));
  }

  getByMode(mode: TravelMode): TransportProvider[] {
    return this.getAllActive().filter((p) => p.mode === mode);
  }

  getByModes(modes: TravelMode[]): TransportProvider[] {
    const modeSet = new Set(modes);
    return this.getAllActive().filter((p) => modeSet.has(p.mode));
  }

  clear(): void {
    this.providers.clear();
    this.disabledProviders.clear();
  }
}

// Global default singleton registry
export const defaultProviderRegistry = new ProviderRegistry();
