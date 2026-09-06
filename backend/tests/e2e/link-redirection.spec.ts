import { test, expect } from '@playwright/test';

test.describe('Link Creation and Redirection E2E Flow', () => {
  let shortCode: string;
  const longUrl = 'https://www.google.com';

  test('Create a shortened link and redirect', async ({ request }) => {
    // 1. Create Link (anonymous request)
    const createRes = await request.post('/api/v1/link/create', {
      data: {
        longUrl,
        redirectType: 'TEMPORARY',
      },
    });

    // We expect the creation to succeed
    expect(createRes.status()).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data).toHaveProperty('shortCode');
    
    shortCode = createBody.data.shortCode;
    expect(shortCode).toBeDefined();

    // 2. Perform Redirection
    // We disable redirect automatic follow in Playwright to check the 302 status code
    const redirectRes = await request.get(`/${shortCode}`, {
      maxRedirects: 0,
    });

    expect(redirectRes.status()).toBe(302);
    const headers = redirectRes.headers();
    expect(headers['location']).toBe(longUrl);
    expect(headers['x-robots-tag']).toBe('noindex');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  test('Link creation blocks localhost destination', async ({ request }) => {
    const invalidRes = await request.post('/api/v1/link/create', {
      data: {
        longUrl: 'http://localhost:3000',
      },
    });

    expect(invalidRes.status()).toBe(400); // Should be blocked by validateUrl
    const body = await invalidRes.json();
    expect(body.success).toBe(false);
  });
});
