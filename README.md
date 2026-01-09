
# Chaishorts CMS

A professional, high-performance Content Management System designed for snackable educational content ("Shorts"). 

## Branding: Chaishorts
Zenith has been rebranded to **Chaishorts** to reflect our focus on quick, digestible, and high-impact educational pieces that you can finish in the time it takes to drink a cup of chai.

## Architecture Overview

- **Frontend**: React 18 SPA with Tailwind CSS + Plus Jakarta Sans Typography.
- **Branding**: Amber/Slate/Indigo palette for a premium content management experience.
- **Worker**: Real-time interval process (every 15s) within the app that publishes scheduled lessons.
- **UI/UX**: Mobile-first design principles for the public catalog and a desktop-optimized admin panel.

## Core Features & Logic

- **Scheduled Publishing**: Set `publish_at` for lessons. The internal "Chaishorts Worker" automatically flips status to `PUBLISHED` when the time arrives.
- **RBAC**: Multi-role support (Admin, Editor, Viewer).
- **Asset Engine**: Normalized asset management for different device form factors (Portrait, Landscape, Square, Banner).
- **API Simulation**: Integrated `/catalog` explorer for developers to test content consumption.

## Getting Started

1. Open the app in any modern browser.
2. Login with standard credentials:
   - **Admin**: `admin@chaishorts.com` / `admin123`
   - **Editor**: `editor@chaishorts.com` / `editor123`
3. Use the **Search Bar** in the dashboard to quickly find programs.
4. Create a program, add a term, and schedule a lesson to see the worker in action!

## Deployment

```bash
docker compose up --build
```
*Spins up web, api, worker, and database simulations.*
