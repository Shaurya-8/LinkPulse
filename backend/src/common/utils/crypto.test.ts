import { describe, it, expect } from '@jest/globals';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  hashPassword,
  verifyPassword,
  getOtpExpiry,
  generateSecureToken,
  hashToken,
} from './crypto.js';

describe('crypto.ts utilities', () => {
  describe('generateOtp', () => {
    it('should generate a numeric string of length configured in config', () => {
      const otp = generateOtp();
      expect(otp).toHaveLength(6); // Default OTP length is 6 in our .env
      expect(/^\d+$/.test(otp)).toBe(true);
    });
  });

  describe('hashOtp and verifyOtp', () => {
    it('should hash the OTP and verify it correctly', async () => {
      const otp = '123456';
      const hash = await hashOtp(otp);
      expect(hash).not.toBe(otp);
      
      const isValid = await verifyOtp(otp, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyOtp('654321', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'mySecretPassword123';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('getOtpExpiry', () => {
    it('should return milliseconds based on config config.otp.expiresMinutes', () => {
      const expiryMs = getOtpExpiry();
      expect(expiryMs).toBe(10 * 60 * 1000); // 10 minutes default
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a hex token of specified byte length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(/^[0-9a-f]+$/i.test(token)).toBe(true);
    });

    it('should default to length 128 (64 bytes)', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(128);
    });
  });

  describe('hashToken', () => {
    it('should correctly hash a token using sha256', () => {
      const token = 'mySecureToken';
      const hashed = hashToken(token);
      expect(hashed).toHaveLength(64); // SHA-256 hash is 64 hex characters
      expect(hashed).toBe(
        '2e5a5c23af1cd6a4a2e3063b7ba8af56d5aeb947af36962fbebe7a126787f226' // SHA-256 of 'mySecureToken'
      );
    });
  });
});
