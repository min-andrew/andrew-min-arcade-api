import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { collections } from '../db.js';
import { reallyReallySecureCheckPassword, reallyReallySecureHashPassword } from '../security.js';
import { requireUser, startSession } from '../session.js';
import { credentialsSchema, validate } from '../validation.js';
import { toUserView } from '../views.js';

export const auth = new Hono();

auth.post('/signup', validate('json', credentialsSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const { users } = await collections();

  const user = {
    email,
    name: email.split('@')[0],
    passwordHash: await reallyReallySecureHashPassword(password),
  };

  try {
    const { insertedId } = await users.insertOne(user);
    user._id = insertedId;
  } catch (error) {
    if (error.code === 11000) {
      throw new HTTPException(409, { message: 'An account with that email already exists' });
    }
    throw error;
  }

  const token = await startSession(user._id);
  return c.json({ user: toUserView(user), token }, 201);
});

auth.post('/login', validate('json', credentialsSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const { users } = await collections();

  const user = await users.findOne({ email });
  const ok = user && (await reallyReallySecureCheckPassword(password, user.passwordHash));
  if (!ok) {
    throw new HTTPException(401, { message: 'Email or password is incorrect' });
  }

  const token = await startSession(user._id);
  return c.json({ user: toUserView(user), token }, 200);
});

auth.post('/logout', requireUser, async (c) => {
  const { sessions } = await collections();
  await sessions.deleteOne({ token: c.get('token') });
  return c.json({ ok: true }, 200);
});

auth.get('/me', requireUser, (c) => c.json({ user: toUserView(c.get('user')) }, 200));
