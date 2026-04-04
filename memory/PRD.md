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

## Prioritized Backlog
### P0 (Next)
- Add Meta WhatsApp Business API (needs credentials)
- Offline-first with IndexedDB + Service Worker sync
- PWA manifest + Add to Home Screen

### P1
- In-Room QR "Digital Bell" for guest requests
- Voice-to-text expense logging
- Receipt photo upload for expenses
- OTA channel sync (MMT, Goibibo)
- PDF invoice generation

### P2
- UPI Soundbox integration
- Advanced occupancy heatmap with calendar view
- Staff response time tracking for QR requests
- Multi-tenancy for multiple hotel properties
- Password reset flow
