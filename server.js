import { serve } from '@hono/node-server';
import { app } from './src/app.js';

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Arcade API listening on http://localhost:${port}`);
});
