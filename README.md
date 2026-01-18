<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy

This project is a digital menu board with an admin panel and a small API server.

## Requirements

- Node.js
- A hosting that can run a Node server (for the API and secure AI proxy)

## Configure

Create or update `.env.local`:

- `ADMIN_PASSWORD` - password for the admin panel
- `JWT_SECRET` - random secret used to sign auth tokens
- `GEMINI_API_KEY` - optional, used by AI image/description generation
- `GEMINI_API_BASE_URL` - optional, override Gemini API base URL (use `https://api.artemox.com` for Artemox)
- `GEMINI_API_VERSION` - optional, override API version (use `v1` for Artemox)

## Run locally (production-like)

1. Install dependencies:
   `npm install`
2. Build the frontend:
   `npm run build`
3. Start the server:
   `npm run start`

The app will be available on `http://localhost:3000`.

## Notes

- The TV should open `/` (menu).
- Admin panel is at `/#/admin`.
