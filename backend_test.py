#!/usr/bin/env python3
"""
Digital Register HMS Backend API Testing
Tests all backend endpoints for the Hotel Management System
"""

import requests
import sys
import json
from datetime import datetime

class HMSAPITester:
    def __init__(self, base_url="https://marathi-rooms.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            if success:
                self.log_test(name, True)
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code} - {response_data}")

            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_auth_login(self, email, password):
        """Test login and get token"""
        print(f"\n🔐 Testing Authentication with {email}")
        success, response = self.run_test(
            f"Login as {email}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True, response
        return False, response

    def test_auth_me(self):
        """Test get current user"""
        return self.run_test(
            "Get current user (/auth/me)",
            "GET",
            "auth/me",
            200
        )

    def test_rooms_list(self):
        """Test get all rooms"""
        success, response = self.run_test(
            "Get all rooms",
            "GET",
            "rooms",
            200
        )
        
        if success and isinstance(response, list):
            room_count = len(response)
            print(f"   Found {room_count} rooms")
            if room_count == 22:
                print(f"   ✅ Correct room count (22)")
            else:
                print(f"   ⚠️  Expected 22 rooms, got {room_count}")
            
            # Check room statuses
            statuses = {}
            for room in response:
                status = room.get('status', 'unknown')
                statuses[status] = statuses.get(status, 0) + 1
            
            print(f"   Room statuses: {statuses}")
            
        return success, response

    def test_room_detail(self, room_number=101):
        """Test get specific room"""
        return self.run_test(
            f"Get room {room_number} details",
            "GET",
            f"rooms/{room_number}",
            200
        )

    def test_room_update(self, room_number=101):
        """Test update room status"""
        return self.run_test(
            f"Update room {room_number} status",
            "PUT",
            f"rooms/{room_number}",
            200,
            data={"status": "clean"}
        )

    def test_checkin_flow(self):
        """Test complete check-in flow"""
        print(f"\n🏨 Testing Check-in Flow")
        
        # First ensure room 101 is clean
        self.run_test(
            "Set room 101 to clean",
            "PUT",
            "rooms/101",
            200,
            data={"status": "clean"}
        )
        
        # Test check-in
        checkin_data = {
            "room_number": 101,
            "guest_name": "Test Guest",
            "guest_phone": "+919876543210",
            "aadhar_number": "123456789012",
            "address": "Test Address, Mumbai",
            "nationality": "Indian",
            "num_guests": 2,
            "rate_per_day": 1000.0,
            "advance_paid": 500.0,
            "payment_method": "cash",
            "id_type": "Aadhar"
        }
        
        success, response = self.run_test(
            "Check-in guest to room 101",
            "POST",
            "bookings/checkin",
            200,
            data=checkin_data
        )
        
        if success and 'booking' in response:
            booking_id = response['booking']['booking_id']
            print(f"   Booking created: {booking_id}")
            return booking_id
        
        return None

    def test_booking_bill(self, booking_id):
        """Test get booking bill preview"""
        return self.run_test(
            f"Get bill preview for {booking_id}",
            "GET",
            f"bookings/{booking_id}/bill",
            200
        )

    def test_checkout_flow(self, booking_id):
        """Test checkout flow"""
        print(f"\n🚪 Testing Check-out Flow")
        
        checkout_data = {
            "booking_id": booking_id,
            "payment_method": "cash",
            "additional_charges": 0,
            "discount": 0
        }
        
        return self.run_test(
            f"Check-out booking {booking_id}",
            "POST",
            "bookings/checkout",
            200,
            data=checkout_data
        )

    def test_galla_summary(self):
        """Test financial summary"""
        return self.run_test(
            "Get Galla summary",
            "GET",
            "galla/summary",
            200
        )

    def test_add_expense(self):
        """Test add expense"""
        expense_data = {
            "description": "Test Expense",
            "amount": 100.0,
            "category": "maintenance"
        }
        
        return self.run_test(
            "Add expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )

    def test_whatsapp_send(self):
        """Test WhatsApp send (mocked)"""
        whatsapp_data = {
            "phone": "+919876543210",
            "message_type": "welcome",
            "guest_name": "Test Guest"
        }
        
        return self.run_test(
            "Send WhatsApp message (mocked)",
            "POST",
            "whatsapp/send",
            200,
            data=whatsapp_data
        )

    def test_whatsapp_logs(self):
        """Test get WhatsApp logs"""
        return self.run_test(
            "Get WhatsApp logs",
            "GET",
            "whatsapp/logs",
            200
        )

    def test_formc_export(self):
        """Test Form C export"""
        return self.run_test(
            "Export Form C data",
            "GET",
            "formc/export",
            200
        )

    def test_analytics_occupancy(self):
        """Test occupancy analytics"""
        return self.run_test(
            "Get occupancy analytics",
            "GET",
            "analytics/occupancy",
            200
        )

    def test_analytics_revenue(self):
        """Test revenue analytics"""
        return self.run_test(
            "Get revenue analytics",
            "GET",
            "analytics/revenue",
            200
        )

    def test_analytics_leakage(self):
        """Test revenue leakage alerts"""
        return self.run_test(
            "Get revenue leakage alerts",
            "GET",
            "analytics/leakage",
            200
        )

    def test_analytics_staff(self):
        """Test staff analytics"""
        return self.run_test(
            "Get staff analytics",
            "GET",
            "analytics/staff",
            200
        )

    # ========== PHASE 2 TESTS ==========
    
    def test_shift_handover(self):
        """Test shift handover with WhatsApp to owner"""
        print(f"\n📋 Testing Shift Handover")
        handover_data = {
            "staff_name": "Test Staff",
            "notes": "Test shift handover notes"
        }
        
        success, response = self.run_test(
            "Create shift handover",
            "POST",
            "galla/shift-handover",
            200,
            data=handover_data
        )
        
        if success and 'summary' in response:
            print(f"   Handover ID: {response['summary'].get('handover_id', 'N/A')}")
            print(f"   WhatsApp sent: {response.get('whatsapp_sent', False)}")
            return True, response
        return False, response

    def test_remote_cashbox(self):
        """Test remote cashbox for owner"""
        print(f"\n💰 Testing Remote Cashbox")
        success, response = self.run_test(
            "Get remote cashbox data",
            "GET",
            "galla/remote",
            200
        )
        
        if success and 'live_galla' in response:
            galla = response['live_galla']
            hotel = response.get('hotel_status', {})
            print(f"   Cash in register: ₹{galla.get('cash_in_register', 0)}")
            print(f"   Hotel occupancy: {hotel.get('occupancy_pct', 0)}%")
            return True, response
        return False, response

    def test_daily_summary(self):
        """Test daily summary generation"""
        success, response = self.run_test(
            "Generate daily summary",
            "GET",
            "galla/daily-summary",
            200
        )
        
        if success and 'message' in response:
            print(f"   WhatsApp sent: {response.get('whatsapp_sent', False)}")
            return True, response
        return False, response

    def test_qr_request_create(self):
        """Test QR guest request creation (no auth)"""
        print(f"\n🔔 Testing QR Digital Bell")
        
        # Save current token and clear it for public endpoint
        saved_token = self.token
        self.token = None
        
        qr_data = {
            "room_number": 101,
            "request_type": "water",
            "guest_name": "Test Guest",
            "details": "Need water bottles"
        }
        
        success, response = self.run_test(
            "Create QR guest request (public)",
            "POST",
            "qr/request",
            200,
            data=qr_data
        )
        
        # Restore token
        self.token = saved_token
        
        if success and 'request_id' in response:
            print(f"   Request ID: {response['request_id']}")
            return response['request_id'], response
        return None, response

    def test_qr_requests_list(self):
        """Test get QR requests for staff"""
        return self.run_test(
            "Get QR requests (staff)",
            "GET",
            "qr/requests",
            200
        )

    def test_qr_request_resolve(self, request_id):
        """Test resolve QR request"""
        if not request_id:
            print("   ⚠️  No request ID to resolve")
            return False, {}
            
        return self.run_test(
            f"Resolve QR request {request_id}",
            "PUT",
            f"qr/requests/{request_id}",
            200
        )

    def test_voice_expense(self):
        """Test voice expense parsing"""
        print(f"\n🎤 Testing Voice Expense")
        voice_data = {
            "text": "200 rupaye laundry"
        }
        
        success, response = self.run_test(
            "Parse voice expense",
            "POST",
            "expenses/voice",
            200,
            data=voice_data
        )
        
        if success and 'amount' in response:
            print(f"   Parsed amount: ₹{response.get('amount', 0)}")
            print(f"   Detected category: {response.get('category', 'unknown')}")
            return True, response
        return False, response

    def test_invoice_generation(self, booking_id):
        """Test invoice generation"""
        if not booking_id:
            print("   ⚠️  No booking ID for invoice")
            return False, {}
            
        return self.run_test(
            f"Generate invoice for {booking_id}",
            "GET",
            f"bookings/{booking_id}/invoice",
            200
        )

    def test_advance_payment(self, booking_id):
        """Test add advance payment"""
        if not booking_id:
            print("   ⚠️  No booking ID for advance")
            return False, {}
            
        advance_data = {
            "booking_id": booking_id,
            "amount": 300.0,
            "payment_method": "cash"
        }
        
        return self.run_test(
            f"Add advance payment to {booking_id}",
            "POST",
            "bookings/advance",
            200,
            data=advance_data
        )

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Digital Register HMS Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test Owner Login
        owner_success, owner_data = self.test_auth_login("admin@hotel.com", "admin123")
        if not owner_success:
            print("❌ Owner login failed - stopping tests")
            return False

        # Test auth endpoints
        self.test_auth_me()

        # Test room management
        self.test_rooms_list()
        self.test_room_detail()
        self.test_room_update()

        # Test booking flow
        booking_id = self.test_checkin_flow()
        if booking_id:
            self.test_booking_bill(booking_id)
            self.test_checkout_flow(booking_id)

        # Test financial features
        self.test_galla_summary()
        self.test_add_expense()

        # Test WhatsApp (mocked)
        self.test_whatsapp_send()
        self.test_whatsapp_logs()

        # Test exports and analytics
        self.test_formc_export()
        self.test_analytics_occupancy()
        self.test_analytics_revenue()
        self.test_analytics_leakage()
        self.test_analytics_staff()

        # ========== PHASE 2 FEATURE TESTS ==========
        print(f"\n🚀 Testing Phase 2 Features")
        
        # Test Shift Handover
        self.test_shift_handover()
        
        # Test Remote Cashbox (owner only)
        self.test_remote_cashbox()
        
        # Test Daily Summary
        self.test_daily_summary()
        
        # Test QR Digital Bell
        request_id, _ = self.test_qr_request_create()
        self.test_qr_requests_list()
        if request_id:
            self.test_qr_request_resolve(request_id)
        
        # Test Voice Expense
        self.test_voice_expense()
        
        # Test Invoice & Advance (if we have a booking)
        if booking_id:
            self.test_invoice_generation(booking_id)
            self.test_advance_payment(booking_id)

        # Test Staff Login
        print(f"\n👤 Testing Staff Login")
        staff_success, staff_data = self.test_auth_login("staff@hotel.com", "staff123")
        if staff_success:
            self.test_rooms_list()  # Test staff can access rooms
            # Test staff can access QR requests
            self.test_qr_requests_list()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Backend API tests PASSED!")
            return True
        else:
            print("⚠️  Backend API tests have issues")
            return False

def main():
    tester = HMSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())