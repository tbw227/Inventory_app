/**
 * Load .env from the backend package directory (not process.cwd()).
 * Fixes missing OPENWEATHER_API_KEY / MONGODB_URI when the shell cwd is elsewhere.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
