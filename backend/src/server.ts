import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.BACKEND_PORT, () => {
  // Keep boot logs simple and readable for local development.
  console.log(`Backend listening on http://localhost:${env.BACKEND_PORT}`);
});
