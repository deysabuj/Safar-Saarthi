import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class Security {
  private static readonly SECRET = env.JWT_SECRET || 'dev-safar-saarthi-secret-key-change-in-prod';
  private static readonly DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Hashes a plain password using scrypt with a unique cryptographically secure salt.
   */
  static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verifies a plain password against a stored salt:hash string using constant-time comparison.
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const parts = storedHash.split(':');
      if (parts.length !== 2) return resolve(false);

      const [salt, key] = parts;
      const keyBuffer = Buffer.from(key, 'hex');

      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        try {
          resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        } catch {
          resolve(false);
        }
      });
    });
  }

  /**
   * Generates a signed JWT with base64url encoding and HMAC-SHA256 signature.
   */
  static generateJwt(
    payload: Omit<TokenPayload, 'iat' | 'exp'>,
    expiresInSeconds: number = Security.DEFAULT_EXPIRY_SECONDS
  ): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', Security.SECRET)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    return `${b64Header}.${b64Payload}.${signature}`;
  }

  /**
   * Verifies and decodes a JWT, checking signature integrity and expiration.
   */
  static verifyJwt(token: string): TokenPayload {
    if (!token || typeof token !== 'string') {
      throw AppError.unauthorized('No authentication token provided');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw AppError.unauthorized('Malformed authentication token');
    }

    const [b64Header, b64Payload, signature] = parts;

    // Verify signature with constant time comparison
    const expectedSig = crypto
      .createHmac('sha256', Security.SECRET)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw AppError.unauthorized('Invalid authentication token signature');
    }

    // Decode and verify expiration
    try {
      const payload: TokenPayload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        throw AppError.unauthorized('Authentication token has expired. Please sign in again.');
      }

      return payload;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized('Failed to decode authentication token');
    }
  }

  /**
   * Masks sensitive credentials for safe logging (supports strings, arrays, and objects).
   */
  static maskSensitive(value?: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      if (value.length < 8) return '****';
      return `${value.slice(0, 3)}...${value.slice(-3)}`;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map((item) => Security.maskSensitive(item));
      }
      const masked: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (/password|secret|token|authorization|apikey|cookie/i.test(k)) {
          masked[k] = '***MASKED***';
        } else if (typeof v === 'object' && v !== null) {
          masked[k] = Security.maskSensitive(v);
        } else {
          masked[k] = v;
        }
      }
      return masked;
    }
    return value;
  }

  /**
   * Validates external booking redirection URL against allowlisted official provider domains.
   * Protects against open redirects, phishing schemes, and script injection.
   */
  static validateBookingUrl(urlStr?: string | null): { isValid: boolean; sanitizedUrl?: string; error?: string } {
    if (!urlStr || typeof urlStr !== 'string') {
      return { isValid: false, error: 'Empty or non-string booking URL' };
    }

    try {
      const parsed = new URL(urlStr.trim());

      // Only HTTPS or HTTP allowed in external redirections
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { isValid: false, error: `Disallowed protocol: ${parsed.protocol}` };
      }

      // Check against allowlisted official ticketing partners
      const ALLOWED_DOMAINS = [
        'irctc.co.in',
        'airindia.com',
        'goindigo.in',
        'spicejet.com',
        'akasaair.com',
        'redbus.in',
        'makemytrip.com',
        'zostel.com',
        'rajasthan.gov.in',
        'ksrtc.in',
        'upsrtc.com',
        'amadeus.com',
        'google.com',
      ];

      const hostname = parsed.hostname.toLowerCase();
      const isAllowed = ALLOWED_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        return {
          isValid: false,
          error: `Unrecognized or untrusted booking domain: ${hostname}. Official deep link required.`,
        };
      }

      // Strip dangerous script or token query params
      const sanitized = new URL(parsed.toString());
      sanitized.searchParams.delete('token');
      sanitized.searchParams.delete('auth');
      sanitized.searchParams.delete('secret');

      return { isValid: true, sanitizedUrl: sanitized.toString() };
    } catch {
      return { isValid: false, error: 'Malformed booking URL syntax' };
    }
  }
}
