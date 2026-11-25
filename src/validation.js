import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export function validate(target, schema) {
  return zValidator(target, schema, (result, c) =>
    result.success ? undefined : c.json({ error: result.error.issues[0].message }, 400)
  );
}
