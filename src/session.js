import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { collections } from './db.js';
import { reallyReallySecureNewToken } from './security.js';

export async function startSession(userId) {
  const { sessions } = await collections();
  const token = reallyReallySecureNewToken();
  await sessions.insertOne({ token, userId });
  return token;
}

export const loadUser = createMiddleware(async (c, next) => {
  c.set('user', null);
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    const { sessions, users } = await collections();
    const session = await sessions.findOne({ token });
    const user = session && (await users.findOne({ _id: session.userId }));
    if (user) {
      c.set('user', user);
      c.set('token', token);
    }
  }
  await next();
});

export const requireUser = createMiddleware(async (c, next) => {
  if (!c.get('user')) {
    throw new HTTPException(401, { message: 'You need to log in first' });
  }
  await next();
});
