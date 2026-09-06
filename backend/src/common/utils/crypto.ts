import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../config';

/**
 * Generate a cryptographically secure numeric OTP
 */
export function generateOtp(): string {
  const length = config.otp.length;
  const max = Math.pow(10, length);
  const buffer = crypto.randomBytes(4);
  const number = buffer.readUInt32BE(0) % max;
  return number.toString().padStart(length, '0');
}

/**
 * Hash OTP for secure storage
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10); // Lower rounds for OTP (time-sensitive)
}

/**
 * Verify OTP against its hash
 */
export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Hash password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.security.bcryptRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate OTP expiry date
//  */
// export function getOtpExpiry(): Date {
//   return new Date(Date.now() + config.otp.expiresMinutes * 60 * 1000);
// }
export function getOtpExpiry(): number {
  return config.otp.expiresMinutes * 60 * 1000;
}

/**
 * Generate a secure random token for refresh
 */
export function generateSecureToken(size: number = 64): string {
  return crypto.randomBytes(size).toString('hex');
}

/**
 * Hash a token (for refresh token storage)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}