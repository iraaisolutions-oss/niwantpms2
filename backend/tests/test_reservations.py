"""
Test suite for Nivant Lodge Reservation System
Tests: Create reservation, list reservations, check-in from reservation, cancel reservation,
       guest search, calendar view, double booking prevention, WhatsApp logs, advance payment
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OWNER_EMAIL = "admin@hotel.com"
OWNER_PASSWORD = "admin123"
STAFF_EMAIL = "staff@hotel.com"
STAFF_PASSWORD = "staff123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for owner"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": OWNER_EMAIL,
        "password": OWNER_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_date():
    """Generate a future test date to avoid conflicts"""
    return (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")


@pytest.fixture(scope="module")
def test_month():
    """Generate test month for calendar"""
    return (datetime.now() + timedelta(days=30)).strftime("%Y-%m")


class TestGuestSearch:
    """Test guest search functionality"""
    
    def test_guest_search_requires_min_2_chars(self, api_client):
        """Guest search should return empty for queries < 2 chars"""
        response = api_client.get(f"{BASE_URL}/api/guests/search?q=R")
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Should return empty list for single character search"
        print("✓ Guest search requires minimum 2 characters")
    
    def test_guest_search_by_name(self, api_client):
        """Search guests by name (case-insensitive)"""
        response = api_client.get(f"{BASE_URL}/api/guests/search?q=Rajesh")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Guest search by name returned {len(data)} results")
    
    def test_guest_search_by_phone(self, api_client):
        """Search guests by phone number"""
        response = api_client.get(f"{BASE_URL}/api/guests/search?q=98")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Guest search by phone returned {len(data)} results")


class TestCreateReservation:
    """Test reservation creation"""
    
    def test_create_reservation_success(self, api_client, test_date):
        """Create a new reservation with all required fields"""
        payload = {
            "room_number": 102,
            "guest_name": "TEST_Reservation_Guest",
            "guest_phone": "9876543210",
            "check_in_date": test_date,
            "rate_per_day": 600,
            "advance_paid": 300,
            "payment_method": "cash",
            "source_channel": "walk-in"
        }
        response = api_client.post(f"{BASE_URL}/api/bookings/reserve", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify booking_id starts with RV-
        assert data["booking_id"].startswith("RV-"), f"Booking ID should start with RV-, got {data['booking_id']}"
        assert data["status"] == "reserved"
        assert data["room_number"] == 102
        assert data["guest_name"] == "TEST_Reservation_Guest"
        assert data["check_in_date"] == test_date
        assert data["advance_paid"] == 300
        
        # Store for later tests
        TestCreateReservation.created_booking_id = data["booking_id"]
        print(f"✓ Created reservation {data['booking_id']} for Room 102 on {test_date}")
    
    def test_double_booking_prevention(self, api_client, test_date):
        """Attempting to reserve same room on same date should fail"""
        payload = {
            "room_number": 102,
            "guest_name": "TEST_Double_Booking",
            "guest_phone": "9999999999",
            "check_in_date": test_date,
            "rate_per_day": 600,
            "advance_paid": 0
        }
        response = api_client.post(f"{BASE_URL}/api/bookings/reserve", json=payload)
        assert response.status_code == 400, f"Should fail with 400, got {response.status_code}"
        assert "already reserved" in response.json().get("detail", "").lower()
        print(f"✓ Double booking correctly prevented for Room 102 on {test_date}")
    
    def test_reservation_creates_whatsapp_log(self, api_client):
        """Verify WhatsApp confirmation message was logged"""
        response = api_client.get(f"{BASE_URL}/api/whatsapp/logs")
        assert response.status_code == 200
        logs = response.json()
        
        # Find reservation confirmation for our test booking
        confirmation_logs = [l for l in logs if l.get("message_type") == "reservation_confirmation" 
                           and "TEST_Reservation_Guest" in l.get("content", "")]
        assert len(confirmation_logs) > 0, "Should have reservation_confirmation WhatsApp log"
        print(f"✓ WhatsApp reservation_confirmation message logged")
    
    def test_reservation_creates_advance_transaction(self, api_client):
        """Verify advance payment was recorded as transaction"""
        response = api_client.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        txns = response.json()
        
        # Find reservation_advance transaction
        advance_txns = [t for t in txns if t.get("category") == "reservation_advance" 
                       and t.get("booking_id") == TestCreateReservation.created_booking_id]
        assert len(advance_txns) > 0, "Should have reservation_advance transaction"
        assert advance_txns[0]["amount"] == 300
        print(f"✓ Advance payment ₹300 recorded as reservation_advance transaction")


class TestListReservations:
    """Test listing reservations"""
    
    def test_get_all_reservations(self, api_client):
        """Get all reserved bookings"""
        response = api_client.get(f"{BASE_URL}/api/bookings/reservations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All should have status='reserved'
        for r in data:
            assert r["status"] == "reserved", f"Found non-reserved booking: {r['booking_id']}"
        
        print(f"✓ Listed {len(data)} reservations, all with status='reserved'")
    
    def test_get_reservations_by_date(self, api_client, test_date):
        """Filter reservations by specific date"""
        response = api_client.get(f"{BASE_URL}/api/bookings/reservations?date={test_date}")
        assert response.status_code == 200
        data = response.json()
        
        for r in data:
            assert r["check_in_date"] == test_date
        
        print(f"✓ Filtered reservations for {test_date}: {len(data)} found")


class TestCalendarView:
    """Test calendar endpoint"""
    
    def test_calendar_returns_grouped_data(self, api_client, test_month):
        """Calendar should return reservations and active bookings grouped by date"""
        response = api_client.get(f"{BASE_URL}/api/bookings/calendar?month={test_month}")
        assert response.status_code == 200
        data = response.json()
        
        assert "days" in data, "Calendar should have 'days' key"
        assert "month" in data, "Calendar should have 'month' key"
        assert data["month"] == test_month
        
        # Check structure of days
        if data["days"]:
            for date_key, day_data in data["days"].items():
                assert "reservations" in day_data or "active" in day_data
        
        print(f"✓ Calendar for {test_month} returned with {len(data['days'])} days with bookings")
    
    def test_calendar_default_month(self, api_client):
        """Calendar without month param should default to current month"""
        response = api_client.get(f"{BASE_URL}/api/bookings/calendar")
        assert response.status_code == 200
        data = response.json()
        
        current_month = datetime.now().strftime("%Y-%m")
        assert data["month"] == current_month
        print(f"✓ Calendar defaults to current month: {current_month}")


class TestReservationCheckin:
    """Test converting reservation to active check-in"""
    
    def test_checkin_from_reservation(self, api_client, test_date):
        """Create a reservation and check it in"""
        # First create a new reservation for check-in test
        payload = {
            "room_number": 103,
            "guest_name": "TEST_Checkin_Guest",
            "guest_phone": "9876500000",
            "check_in_date": datetime.now().strftime("%Y-%m-%d"),  # Today for immediate check-in
            "rate_per_day": 1000,
            "advance_paid": 500
        }
        create_response = api_client.post(f"{BASE_URL}/api/bookings/reserve", json=payload)
        assert create_response.status_code == 200
        booking_id = create_response.json()["booking_id"]
        
        # Now check in
        checkin_response = api_client.post(f"{BASE_URL}/api/bookings/reserve/{booking_id}/checkin")
        assert checkin_response.status_code == 200, f"Check-in failed: {checkin_response.text}"
        
        data = checkin_response.json()
        assert data["booking_id"] == booking_id
        assert data["room_number"] == 103
        
        # Verify booking status changed to active
        booking_response = api_client.get(f"{BASE_URL}/api/bookings?status=active")
        assert booking_response.status_code == 200
        active_bookings = booking_response.json()
        found = any(b["booking_id"] == booking_id and b["status"] == "active" for b in active_bookings)
        assert found, "Booking should now be active"
        
        # Verify room is now occupied
        room_response = api_client.get(f"{BASE_URL}/api/rooms/103")
        assert room_response.status_code == 200
        room = room_response.json()
        assert room["status"] == "occupied", f"Room should be occupied, got {room['status']}"
        
        # Store for cleanup
        TestReservationCheckin.checked_in_booking_id = booking_id
        print(f"✓ Reservation {booking_id} checked in, Room 103 now occupied")
    
    def test_checkin_non_reserved_fails(self, api_client):
        """Cannot check in a booking that's not reserved"""
        # Try to check in the already checked-in booking
        booking_id = TestReservationCheckin.checked_in_booking_id
        response = api_client.post(f"{BASE_URL}/api/bookings/reserve/{booking_id}/checkin")
        assert response.status_code == 400
        assert "not a reserved booking" in response.json().get("detail", "").lower()
        print(f"✓ Cannot check in non-reserved booking (already active)")
    
    def test_checkin_nonexistent_fails(self, api_client):
        """Check-in for non-existent booking should fail"""
        response = api_client.post(f"{BASE_URL}/api/bookings/reserve/RV-NONEXISTENT/checkin")
        assert response.status_code == 404
        print(f"✓ Check-in for non-existent booking returns 404")


class TestReservationCancel:
    """Test cancelling reservations"""
    
    def test_cancel_reservation(self, api_client, test_date):
        """Create and cancel a reservation"""
        # Create a reservation to cancel
        payload = {
            "room_number": 105,
            "guest_name": "TEST_Cancel_Guest",
            "guest_phone": "9876511111",
            "check_in_date": test_date,
            "rate_per_day": 1000,
            "advance_paid": 0
        }
        create_response = api_client.post(f"{BASE_URL}/api/bookings/reserve", json=payload)
        assert create_response.status_code == 200
        booking_id = create_response.json()["booking_id"]
        
        # Cancel it
        cancel_response = api_client.post(f"{BASE_URL}/api/bookings/reserve/{booking_id}/cancel")
        assert cancel_response.status_code == 200
        
        data = cancel_response.json()
        assert data["booking_id"] == booking_id
        assert "cancelled" in data["message"].lower()
        
        # Verify status changed to cancelled
        all_bookings = api_client.get(f"{BASE_URL}/api/bookings").json()
        cancelled_booking = next((b for b in all_bookings if b["booking_id"] == booking_id), None)
        assert cancelled_booking is not None
        assert cancelled_booking["status"] == "cancelled"
        
        print(f"✓ Reservation {booking_id} cancelled successfully")
    
    def test_cancel_non_reserved_fails(self, api_client):
        """Cannot cancel a booking that's not reserved"""
        # Try to cancel the already checked-in booking
        booking_id = TestReservationCheckin.checked_in_booking_id
        response = api_client.post(f"{BASE_URL}/api/bookings/reserve/{booking_id}/cancel")
        assert response.status_code == 400
        assert "not a reserved booking" in response.json().get("detail", "").lower()
        print(f"✓ Cannot cancel non-reserved booking (already active)")
    
    def test_cancel_nonexistent_fails(self, api_client):
        """Cancel for non-existent booking should fail"""
        response = api_client.post(f"{BASE_URL}/api/bookings/reserve/RV-NONEXISTENT/cancel")
        assert response.status_code == 404
        print(f"✓ Cancel for non-existent booking returns 404")


class TestExistingReservation:
    """Test with existing test reservation mentioned in context"""
    
    def test_existing_reservation_exists(self, api_client):
        """Check if test reservation RV-E5DF8CE7 exists (from context)"""
        response = api_client.get(f"{BASE_URL}/api/bookings/reservations")
        assert response.status_code == 200
        reservations = response.json()
        
        # Look for the test reservation
        test_res = next((r for r in reservations if r["booking_id"] == "RV-E5DF8CE7"), None)
        if test_res:
            assert test_res["room_number"] == 201
            assert test_res["guest_name"] == "Suresh Sharma"
            assert test_res["advance_paid"] == 500
            print(f"✓ Found existing test reservation RV-E5DF8CE7 for Suresh Sharma")
        else:
            print(f"⚠ Test reservation RV-E5DF8CE7 not found (may have been used/cancelled)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_reservations(self, api_client):
        """Cancel any remaining TEST_ reservations"""
        response = api_client.get(f"{BASE_URL}/api/bookings/reservations")
        if response.status_code == 200:
            reservations = response.json()
            for r in reservations:
                if r["guest_name"].startswith("TEST_"):
                    api_client.post(f"{BASE_URL}/api/bookings/reserve/{r['booking_id']}/cancel")
                    print(f"  Cleaned up: {r['booking_id']}")
        
        # Checkout the checked-in room if still active
        if hasattr(TestReservationCheckin, 'checked_in_booking_id'):
            booking_id = TestReservationCheckin.checked_in_booking_id
            checkout_response = api_client.post(f"{BASE_URL}/api/bookings/checkout", json={
                "booking_id": booking_id,
                "payment_method": "cash"
            })
            if checkout_response.status_code == 200:
                print(f"  Checked out: {booking_id}")
        
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
