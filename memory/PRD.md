# Digital Register HMS - PRD

## Original Problem Statement
Build the "Digital Register" Hotel Management System (HMS) - a Marathi-first, mobile-optimized tool for Indian budget hotels with "Big Buttons, Zero Typing" philosophy, Traffic Light room status, offline-first architecture, and automated Indian billing logic.

## Architecture
- **Backend**: FastAPI + MongoDB (motor) on port 8001
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons on port 3000
- **Database**: MongoDB with collections: users, rooms, bookings, guests, transactions, expenses, whatsapp_logs, form_c_exports, audit_logs
- **Auth**: JWT Bearer tokens with Staff/Owner roles

## User Personas
1. **Hotel Chotu/Staff** - Low tech-literacy reception staff. Needs big buttons, Marathi UI, fast check-in
2. **Hotel Owner** - Remote monitoring. Needs analytics, revenue tracking, audit logs

## Core Requirements
- 22-room dashboard with Traffic Light color coding (Green=Clean, Red=Occupied, Yellow=Cleaning)
- Marathi-first UI with English toggle
- Check-in/Check-out workflow with Aadhar camera upload (simulated OCR)
- Automated billing: Early Check-In (<4hrs = Full Day), Late Check-Out (5hr grace), Extra Guest +₹200
- Digital Galla: Cash vs UPI tracking, shift handover summaries
- WhatsApp Engine (MOCKED - ready for Meta API credentials)
- Form C government export (CSV for police portal)
- Owner analytics: Occupancy heatmap, revenue leakage alerts, staff performance
- Audit logs for rate changes
- Offline banner for internet outages

## What's Been Implemented (2026-04-04)
- Full JWT auth with Owner/Staff roles and admin seeding
- 22-room interactive dashboard with Traffic Light grid
- Complete check-in flow with Aadhar OCR simulation, guest details, payment
- Check-out flow with billing calculation, additional charges, discounts
- Bill preview with live calculation
- Digital Galla with Cash/UPI tracking, expense management
- Owner analytics dashboard with occupancy, revenue, leakage alerts, staff stats
- Form C export with CSV download
- WhatsApp message logs (mocked)
- Marathi/English language toggle throughout
- Bottom navigation with role-based tabs
- Audit logging for rate changes
- Revenue leakage detection (rooms in cleaning >10hrs)

## Phase 2 Implemented (2026-04-04)
- Remote Cashbox: Owner sees live galla from anywhere with 15s auto-refresh
- Shift Handover: Staff completes shift, generates summary, mocks WhatsApp to owner
- Daily Auto Summary: One-tap daily report generation sent to owner via WhatsApp (mocked)
- QR Digital Bell: Public guest page (/qr/:roomNumber) for water/cleaning/towel/bill requests
- Staff Request Board: View and resolve pending QR requests
- Voice Expense: Parse text like "200 rupaye laundry" into categorized expense
- PDF Invoice: Print-ready invoice generation from room detail page
- Add Advance: Quick advance payment from room detail
- IndexedDB offline storage with Dexie (rooms, bookings, pending actions cache)
- PWA manifest for Add to Home Screen
- Offline sync queue for pending actions

## Prioritized Backlog
### P0 (Next)
- Add Meta WhatsApp Business API credentials to activate all mocked messages
- Service Worker for true offline caching of static assets

### P1
- OTA channel sync (MakeMyTrip, Goibibo)
- UPI Soundbox integration
- Receipt photo upload for expenses (object storage)
- Advanced calendar heatmap view for occupancy

### P2
- Multi-tenancy for multiple hotel properties
- Password reset flow
- Staff response time tracking for QR requests
- Guest review/feedback collection
