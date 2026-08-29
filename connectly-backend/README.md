# Connectly Backend

Node.js API server with Express, MongoDB, and Socket.io.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables and update values as needed:

   ```bash
   cp .env .env.local
   ```

3. Start MongoDB locally, then run the server:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start in production mode

## Project Structure

```
src/
├── config/       # Database and app configuration
├── controllers/  # Route handlers
├── middleware/   # Auth and request middleware
├── models/       # Mongoose models
├── routes/       # Express routes
├── services/     # Business logic
├── sockets/      # Socket.io handlers
├── utils/        # Helpers
├── app.js        # Express app setup
└── server.js     # Server entry point
```
