# chat-app-socket.io-redis-

## Deployment Setup

This repo is split into two apps:

- `client` deploys to Vercel
- `server` deploys to Render

### Frontend on Vercel

- Project root: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_URL=https://your-backend.onrender.com/api`
  - `VITE_SOCKET_URL=https://your-backend.onrender.com` if you want to override the socket host

### Backend on Render

- Project root: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Environment variables:
  - `MONGO_URI`
  - `MONGO_URI_LOCAL` if you want a local fallback during development
  - `JWT_SECRET`
  - `REDIS_URL`
  - `CLIENT_URL=https://your-frontend.vercel.app`

### Notes

- `CLIENT_URL` can be a comma-separated list if you need to allow more than one frontend origin.
- `.env` files are ignored by Git, so your local secrets stay private.
