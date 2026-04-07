# Nivant Lodge - Hotel Management System

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, Phosphor Icons, PWA
- **Backend**: FastAPI, Motor (Async MongoDB), JWT Auth
- **Database**: MongoDB
- **AI OCR**: GPT-4o vision via Emergent Integrations

## Room Inventory
| Type | Rooms | Rate |
|------|-------|------|
| Standard | 101, 102, 201, 202, 203, 301, 302, 303 | ₹600/day |
| Deluxe | 103, 105, 106, 107 | ₹1000/day |
| Deluxe (Special) | 104 | ₹500/day |
| AC Deluxe | 204, 205, 206, 304, 305, 306, 404, 405, 406 | ₹1200/day |

## All Completed Features
- JWT Auth (Owner/Staff roles), 22-room dashboard with Traffic Light Logic
- Check-in/Check-out with Nivant Lodge billing (12 PM, no grace overstay)
- **Check-in validation**: Name (min 2 chars), Phone (10 digits), Aadhar (12 digits)
- **Additional guests**: Add multiple guest names+phones for group check-ins
- **Face photo capture**: Phone camera at check-in
- **Aadhar photo storage**: Card image stored in DB
- **Signature capture**: Draw-on-screen signature pad, stored as base64
- **"Same as Mobile" checkbox** for WhatsApp number
- **AI-powered Aadhar OCR**: GPT-4o reads card → auto-fills name, number, address
- **Early arrival warning**: Only sent to channel manager bookings (not walk-ins)
- Fresh Service (30 min, ₹200) with num_people + payment method
- Digital Galla, Shift Handover, Remote Cashbox
- **Send Bill on WhatsApp** (replaced Print Invoice)
- Full Channel Manager (5 tabs), 5 OTA channels
- Future Reservations with calendar + list views, guest search
- Form C Export with **date range filter** (From/To)
- Room Management (Standard/Deluxe/AC Deluxe)
- Booking History API, QR Digital Bell
- PWA, Marathi/English toggle, Emergent branding removed

## Policies
- Check-in/out: 12:00 PM | Overstay: >24h = full day | Early arrival (channel only): ₹500 | Fresh: 30 min ₹200

## Mocked: WhatsApp API, OTA Sync | Real: Aadhar OCR (GPT-4o)

## Backlog
- P1: AC room allocation logic, Room conversion (AC→Non-AC)
- P1: Communication status tracking + manual WhatsApp resend
- P1: Data backup (cloud every 15 days, monthly download)
- P2: Real WhatsApp API, Google Sheets export for police
- P2: Self-hosting guide + deployment documentation
- P3: Backend refactoring (server.py → modular routers)
