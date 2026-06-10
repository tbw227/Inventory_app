require('./loadEnv');

const connectDB = require('./config/db');
const { ensurePhotosBucket } = require('./lib/supabaseAdmin');

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

let app;
try {
  app = require('./app');
} catch (err) {
  console.error('Failed to load app:', err?.message || err);
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Production startup checklist: DATABASE_URL, DIRECT_URL, JWT_SECRET, FRONTEND_URL (see docs/RAILWAY.md)'
    );
  }
  process.exit(1);
}

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(() => ensurePhotosBucket())
    .then(() => {
      const server = app.listen(PORT, HOST, () =>
        console.log(`Server running on http://${HOST}:${PORT}`)
      );

      const shutdown = async (signal) => {
        console.log(`${signal} received, closing server and database pool…`);
        let code = 0;
        await new Promise((resolve) => {
          server.close((err) => {
            if (err) {
              console.error('HTTP server close error:', err);
              code = 1;
            }
            resolve();
          });
        });
        try {
          await connectDB.disconnect();
        } catch (e) {
          console.error('Prisma disconnect error:', e);
          code = 1;
        }
        process.exit(code);
      };

      process.once('SIGTERM', () => {
        void shutdown('SIGTERM');
      });
      process.once('SIGINT', () => {
        void shutdown('SIGINT');
      });
    })
    .catch((err) => {
      console.error('Failed to start:', err?.message || err);
      process.exit(1);
    });
}

module.exports = app;
