import { test, expect } from '@playwright/test';

test.describe('Authentication API E2E Flow', () => {
  const testUser = {
    email: `playwright.test.${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    firstName: 'Playwright',
    lastName: 'Tester',
  };

  test('User Registration and Login Flow', async ({ request }) => {
    // 1. Register User
    const registerRes = await request.post('/api/v1/auth/register', {
      data: testUser,
    });
    
    // Note: If registration succeeds or if the user is redirected / requires email validation
    expect(registerRes.status()).toBe(201);
    const registerBody = await registerRes.json();
    expect(registerBody.success).toBe(true);

    // 2. Login User
    const loginRes = await request.post('/api/v1/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.user.email).toBe(testUser.email.toLowerCase());

    // Assert that auth cookies (accessToken, refreshToken) are returned
    const headers = loginRes.headers();
    const setCookie = headers['set-cookie'] || '';
    expect(setCookie).toContain('accessToken');
    expect(setCookie).toContain('refreshToken');
  });

  test('Rejected registration with invalid passwords', async ({ request }) => {
    const invalidRes = await request.post('/api/v1/auth/register', {
      data: {
        email: 'invalid-pw@example.com',
        password: '123', // too short, no capital, no special chars
        firstName: 'No',
      },
    });

    expect(invalidRes.status()).toBe(400); // Zod validation rejects
    const body = await invalidRes.json();
    expect(body.success).toBe(false);
  });
});
