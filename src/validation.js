import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { BOARD_SIZE } from '@min-andrew/arcade-core';

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const shotSchema = z.object({
  x: z.int().min(0).max(BOARD_SIZE - 1),
  y: z.int().min(0).max(BOARD_SIZE - 1),
});

export const gameIdSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Not a valid game id'),
});

export function validate(target, schema) {
  return zValidator(target, schema, (result, c) =>
    result.success ? undefined : c.json({ error: result.error.issues[0].message }, 400)
  );
}
