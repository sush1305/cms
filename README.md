
# Chaishorts CMS

## Architecture Overview
- **Backend**: Node.js/Express with `pg` for Postgres connectivity.
- **Worker**: Integrated `setInterval` worker in the main API process (for demo simplicity) that processes scheduled content.
- **Database**: Postgres with optimized indices for status and publishing lookups.
- **Frontend**: React 18 with Tailwind CSS.

## Features
- **Scheduled Publishing**: Set a `publish_at` date. The background worker publishes it automatically.
- **Auto-Publish Program**: Programs flip to `published` automatically when their first lesson goes live.
- **Role-Based Access**: Strict RBAC in both UI and API.

## Local Setup
1. Run `docker compose up --build`
2. Access the CMS at `http://localhost:5173`
3. Login as:
   - Admin: `admin@chaishorts.com` / `admin123`
   - Editor: `editor@chaishorts.com` / `editor123`

## Demo Flow
1. Login as **Editor**.
2. Go to "The Chai Masterclass" program.
3. Add a new lesson or edit the existing one.
4. Set status to `scheduled` and set `publish_at` to 1 minute from now.
5. Wait for the background worker (runs every 60s).
6. Verify status changes to `published`.
7. Check the **Public Catalog** to see the new entry.
