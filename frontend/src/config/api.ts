/**
 * Safar Saarthi Frontend API Configuration
 * Resolves backend API URL from environment variables across local, Docker, and Vercel environments.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    return 'http://localhost:5000/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  // If user provided a host without /api (e.g. https://backend.up.railway.app), append /api
  if (clean.startsWith('http') && !clean.endsWith('/api') && !clean.includes('/api/')) {
    return `${clean}/api`;
  }
  return clean;
}
