import type { Context } from "hono";
import type { z } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function parseJsonBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await c.req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(400, "validation_error", "Request body did not match the expected shape.", parsed.error.flatten());
  }

  return parsed.data;
}

export function apiErrorResponse(error: ApiError): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    },
    { status: error.status }
  );
}

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new ApiError(500, "missing_env", `Missing required environment variable ${name}.`);
  }

  return value;
}
