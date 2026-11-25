import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { loadUser } from './session.js';
import { auth } from './routes/auth.js';

export const app = new Hono();

app.use('/api/*', loadUser);
app.route('/api/auth', auth);

app.notFound((c) => c.json({ error: `No route for ${c.req.method} ${c.req.path}` }, 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  console.error(error);
  return c.json({ error: 'Something went wrong on the server' }, 500);
});
