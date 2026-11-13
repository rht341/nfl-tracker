import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nflRoutes } from './routes/nfl.ts';
import { userRoutes } from './routes/user.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(__dirname, '..'));
const distRel = './dist';

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ status: 'ok', time: Date.now() }));
app.route('/api', nflRoutes);
app.route('/api/user', userRoutes);

// Also serve built frontend assets so http://127.0.0.1:3001 works standalone
app.use('/*', serveStatic({ root: distRel }));

const port = Number(process.env.PORT || 3001);

serve(
  {
    fetch: app.fetch,
    port,
    hostname: '127.0.0.1',
  },
  (info) => {
    console.log(`[GRIDIRON] Server & UI live on http://127.0.0.1:${info.port}`);
    // Pre-warm current season schedule & standings cache on startup
    fetch(`http://127.0.0.1:${info.port}/api/standings?season=2026`)
      .then((r) => r.json())
      .then((d: any) => {
        console.log(
          `[GRIDIRON] Pre-warmed 2026 season cache: ${d?.regularSeasonGames?.length ?? 0} games loaded`
        );
      })
      .catch(() => {});
  }
);
