# Nivant Lodge - Hotel Management System

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, PWA
- Backend: FastAPI, Motor (Async MongoDB), JWT
- AI OCR: GPT-4o vision via Emergent Integrations

## All Completed Features
- JWT Auth (Owner/Staff), 22-room dashboard, Traffic Light Logic
- Check-in with validation (Name*, Phone 10-digit*, Aadhar 12-digit*)
- Mandatory photo captures: Face photo*, Aadhar card photo*, Signature photo* (camera capture of physical signature)
- AI Aadhar OCR (GPT-4o reads card details)
- Additional guests for groups, booking source selector
- Same as Mobile checkbox for WhatsApp, early arrival warning (channel only)
- Fresh Service with Rate Per Customer input, num_people, payment method
- Digital Galla, Shift Handover, Remote Cashbox
- Send Bill on WhatsApp (PDF format, mocked)
- Add Pending Amount (inline input, not popup)
- Channel Manager (5 tabs), 5 OTA channels, Reservations with calendar+list
- Form C Export with date range filter (From/To for police timeline)
- Room Management (Standard/Deluxe/AC Deluxe)
- Nivant Lodge logo on Login, Dashboard, Menu
- ₹ symbol in all money input fields
- Emergent branding removed

## Mocked: WhatsApp API, OTA Sync | Real: Aadhar OCR (GPT-4o)

## Backlog
- P1: AC room allocation, Room conversion (AC→Non-AC)
- P1: Communication status tracking + WhatsApp resend
- P1: Data backup (cloud 15 days, monthly download)
- P2: Real WhatsApp API, Google Sheets export, PDF bill generation
- P2: Self-hosting guide
- P3: Backend refactoring
