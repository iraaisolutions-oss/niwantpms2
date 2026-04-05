# Nivant Lodge - Hotel Management System

## Original Problem Statement
Build a Marathi-first, mobile-optimized PWA Hotel Management System for Nivant Lodge, an Indian budget hotel with 22 rooms across 4 floors.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Phosphor Icons, PWA
- **Backend**: FastAPI, Motor (Async MongoDB), JWT Auth
- **Database**: MongoDB

## Room Inventory
| Type | Rooms | Rate |
|------|-------|------|
| Standard | 101, 102, 201, 202, 203, 301, 302, 303 | ₹600/day |
| Non-AC Deluxe | 103, 105, 106, 107 | ₹1000/day |
| Non-AC Deluxe (Special) | 104 | ₹500/day |
| AC Deluxe | 204, 205, 206, 304, 305, 306, 404, 405, 406 | ₹1200/day |

## Completed Features

### Phase 1 (Core)
- [x] JWT Auth with role-based access (Owner/Staff)
- [x] 22-room interactive dashboard with Traffic Light Logic
- [x] Check-in/Check-out with Nivant Lodge billing rules
- [x] Digital Galla (Cashbox) with expense tracking
- [x] Mocked WhatsApp messaging engine
- [x] Form C Export (CSV)
- [x] Marathi-English language toggle
- [x] PWA Manifest & IndexedDB setup

### Phase 2 (Operations)
- [x] Remote Cashbox for owners
- [x] Shift Handover
- [x] QR Digital Bell for guest requests

### Phase 3 (Channel Manager)
- [x] Full Channel Manager (5 tabs: Overview, Channels, Rates, Bookings, Sync)
- [x] 5 OTA channels seeded (OYO, MakeMyTrip, Booking.com, Agoda, Goibibo)
- [x] Booking Source tracking on check-in
- [x] Owner Room Management (CRUD)
- [x] Hotel Settings API (WiFi, rules, configurable by owner)

### Phase 4 (Nivant Lodge Overhaul) - Feb 2026
- [x] Room inventory restructured to Nivant Lodge layout (22 rooms, 3 types, 4 floors)
- [x] Billing: 12 PM check-in/out, overstay = full day charge (NO grace period)
- [x] Fresh Service (30 min, ₹200) with quick booking from dashboard
- [x] Face photo capture at check-in (phone camera, stored as base64)
- [x] Primary Phone + WhatsApp Number fields with "Copy from Primary" button
- [x] Aadhaar stored unmasked (full number for Form C compliance)
- [x] Voice button removed from Galla/Expenses
- [x] Emergent branding removed (CSS hide)
- [x] Hotel renamed to "Nivant Lodge" throughout
- [x] Auto WhatsApp: Welcome + WiFi + Rules + Early arrival warning (₹500)
- [x] Booking History endpoint with pagination

## Policies
- Check-in/out: 12:00 PM
- Overstay: >24h = full day charge, no grace
- Early arrival: Before 12 PM = ₹500 temporary room
- Fresh Service: 30 min, ₹200

## Mocked Integrations
- WhatsApp Business API (logged to DB)
- Aadhar OCR (simulated demo data)
- OTA Channel Sync (simulated bookings)

## Backlog / Future Tasks
- P1: AC room allocation logic (≤2 guests → 205/305/405, >2 → 204/206/304/306/404/406)
- P1: Room conversion (AC → Non-AC toggle)
- P1: Future bookings with date selection + OTA sync
- P1: Communication status tracking ("Delivered"/"Failed") + dashboard flag
- P1: Manual resend WhatsApp button if undelivered
- P2: Real Meta WhatsApp API integration
- P2: Real Aadhar OCR integration
- P2: Hide room numbers from booking platform display
- P2: Check-in/Check-out history page (permanent ledger UI)
- P3: Backend refactoring (server.py → modular routers)
