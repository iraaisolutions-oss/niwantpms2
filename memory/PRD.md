# Digital Register - Hotel Management System (HMS)

## Original Problem Statement
Build a "Digital Register" Hotel Management System. Marathi-first, mobile-optimized PWA for Indian budget hotels. Core philosophy: "Big Buttons, Zero Typing", Traffic Light Logic for room dashboard, simulated Aadhar OCR, automated billing, Digital Galla, WhatsApp engine (mocked), Form C Export, and offline-first capabilities.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Phosphor Icons, PWA
- **Backend**: FastAPI, Motor (Async MongoDB), JWT Auth
- **Database**: MongoDB

## User Personas
- **Owner (मालक)**: Full access - analytics, room management, channel manager, remote cashbox, settings
- **Staff (कर्मचारी)**: Operational access - dashboard, check-in/out, galla, expenses, guest requests

## Core Requirements
- [x] JWT Auth with role-based access (Owner/Staff)
- [x] 22-room interactive dashboard with Traffic Light Logic (Green/Red/Yellow)
- [x] Check-in/Check-out flows with billing rules (Early check-in, Late check-out, Extra guest charges)
- [x] Digital Galla (Cashbox) with expense tracking
- [x] Mocked WhatsApp messaging engine
- [x] Form C Export (CSV)
- [x] Marathi-English language toggle
- [x] PWA Manifest & IndexedDB setup
- [x] Remote Cashbox for owners
- [x] Shift Handover
- [x] QR Digital Bell for guest requests

## Phase 3 Features (Completed Feb 2026)
- [x] **Auto-send WhatsApp on Check-in**: Welcome message + WiFi details + Hotel Rules (3 messages auto-sent)
- [x] **Owner Room Management**: Add/Edit/Delete rooms (room number, floor, type, rate) - Owner only
- [x] **Voice Expense (Web Speech API)**: Mic button records voice → speech-to-text → parse expense. Fallback to text input.
- [x] **Full Channel Manager**: 5-tab interface (Overview, Channels, Rates, Bookings, Sync) with OTA integration simulation
- [x] **OCR Scan Fix**: Consistent demo data on scan instead of random garbage
- [x] **Booking Source Tracking**: Channel selector on check-in (Walk-in + OTAs)
- [x] **Hotel Settings API**: WiFi name/password, hotel rules, configurable by owner

## Key API Endpoints
- Auth: POST /api/auth/login, /api/auth/register, GET /api/auth/me
- Rooms: GET /api/rooms, PUT /api/rooms/{room_number}, GET /api/rooms/{room_number}
- Room Management: POST/PUT/DELETE /api/rooms/manage/{room_number}
- Bookings: POST /api/bookings/checkin, /api/bookings/checkout, GET /api/bookings
- Galla: GET /api/galla/summary, GET /api/galla/remote
- Expenses: POST /api/expenses, POST /api/expenses/voice
- Channels: GET/POST /api/channels, PUT/DELETE /api/channels/{id}
- Channel Rates: GET/POST /api/channels/rates
- Channel Bookings: GET /api/channels/bookings
- Channel Sync: POST /api/channels/sync
- Channel Analytics: GET /api/channels/analytics
- Settings: GET/PUT /api/settings
- WhatsApp: POST /api/whatsapp/send, GET /api/whatsapp/logs
- Form C: GET /api/formc/export
- QR Bell: POST /api/qr/request, GET /api/qr/requests

## Database Collections
- users, rooms, bookings, guests, transactions, expenses, whatsapp_logs, settings, channels, channel_rates, form_c_exports, shift_handovers, qr_requests, audit_logs

## Seeded Data
- 22 rooms (101-122), 2 users (owner + staff), 5 OTA channels (OYO 25%, MakeMyTrip 20%, Booking.com 15%, Agoda 18%, Goibibo 20%), Hotel settings with WiFi and rules

## Mocked Integrations
- WhatsApp Business API (logs to DB with mocked_sent status)
- Aadhar OCR (simulated - fills fixed demo data)
- OTA Channel Sync (simulated bookings from random channels)

## Backlog / Future Tasks
- P1: Real Meta WhatsApp API integration (requires user credentials)
- P2: Real Aadhar OCR integration
- P2: Occupancy Calendar Heatmap
- P3: Server.py refactoring into modular routers
