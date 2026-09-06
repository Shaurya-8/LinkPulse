import { Response } from 'express';
import { ApiResponse, ValidationError } from '../../types';

export function successResponse<T>(
  res: Response,
  data: T,
  message: string,
  statusCode = 200,
  meta?: Record<string, unknown>
): Response {
  const body: ApiResponse<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode: number,
  code?: string,
  errors?: ValidationError[]
): Response {
  const body: ApiResponse = { success: false, message };
  if (errors?.length) body.errors = errors;
  if (code) body.meta = { code };
  return res.status(statusCode).json(body);
}