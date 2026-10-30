import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';

const app = createApp();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, () => {
  console.log(`[Safar Saarthi Backend] Server listening on http://localhost:${PORT}`);
  console.log(`[Safar Saarthi Backend] Health check: http://localhost:${PORT}/api/health`);
});
