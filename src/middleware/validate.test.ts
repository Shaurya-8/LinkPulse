import { describe, it, expect } from '@jest/globals';
import * as z from 'zod';
import { Request, Response } from 'express';
import { validate } from './validate.middleware.js';
import { ValidationAppError } from '../common/errors/AppError.js';

describe('validate middleware', () => {
  const schema = {
    body: z.object({
      username: z.string().min(3),
      age: z.number().int().positive(),
    }),
    query: z.object({
      search: z.string().optional(),
    }),
  };

  it('should validate correctly and store data in req.validated', () => {
    const middleware = validate(schema);

    const req = {
      body: {
        username: 'alice',
        age: 30,
      },
      query: {
        search: 'hello',
      },
    } as unknown as Request;

    const res = {} as Response;
    let nextCalled = false;
    let nextError: any = null;

    const next = (err?: any) => {
      nextCalled = true;
      nextError = err;
    };

    middleware(req, res, next);

    expect(nextCalled).toBe(true);
    expect(nextError).toBeUndefined();
    expect(req.validated).toBeDefined();
    expect(req.validated!.body).toEqual({ username: 'alice', age: 30 });
    expect(req.validated!.query).toEqual({ search: 'hello' });
  });

  it('should call next with ValidationAppError if validation fails', () => {
    const middleware = validate(schema);

    const req = {
      body: {
        username: 'al', // too short
        age: -5, // not positive
      },
      query: {},
    } as unknown as Request;

    const res = {} as Response;
    let nextCalled = false;
    let nextError: any = null;

    const next = (err?: any) => {
      nextCalled = true;
      nextError = err;
    };

    middleware(req, res, next);

    expect(nextCalled).toBe(true);
    expect(nextError).toBeInstanceOf(ValidationAppError);
    expect(nextError.errors.some((e: any) => e.field === 'username')).toBe(true);
    expect(nextError.errors.some((e: any) => e.field === 'age')).toBe(true);
  });
});
