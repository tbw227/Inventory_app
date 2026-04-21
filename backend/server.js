require('./loadEnv');

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(() => {
      const server = app.listen(PORT, () =>
        console.log(`Server running on port ${PORT}`)
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
