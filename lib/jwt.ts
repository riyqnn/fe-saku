/**
 * JWT Management Utility
 * Handles JWT generation and verification for authentication
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Get JWT secret from environment (must be 32+ bytes for HS256)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-min-32-chars-long';

const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * JWT Payload interface
 */
export interface SakuJWTPayload {
  phone: string;
  walletAddress: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for authenticated user
 * @param payload - User data to encode in token
 * @param expiresIn - Token expiration time (default: 7 days)
 * @returns Signed JWT token
 */
export async function generateToken(
  payload: {
    phone: string;
    walletAddress: string;
  },
  expiresIn: string = '7d'
): Promise<string> {
  try {
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey);

    return token;
  } catch (error) {
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify and decode JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<SakuJWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    // Validate required fields and cast to our interface
    const phone = payload.phone as string;
    const walletAddress = payload.walletAddress as string;

    if (!phone || !walletAddress) {
      throw new Error('Invalid token payload');
    }

    return {
      phone,
      walletAddress,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;

  return authHeader.substring(7);
}

/**
 * Check if token is expired without throwing error
 * @param token - JWT token to check
 * @returns true if token is expired, false otherwise
 */
export async function isTokenExpired(token: string): Promise<boolean> {
  try {
    await verifyToken(token);
    return false;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param token - JWT token
 * @returns Expiration date or null
 */
export async function getTokenExpiration(token: string): Promise<Date | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const exp = payload.exp;

    return exp ? new Date(exp * 1000) : null;
  } catch (error) {
    return null;
  }
}
