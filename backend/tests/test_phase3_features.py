"""
Phase 3 Feature Tests for Digital Register HMS
Tests: Auto-send WhatsApp, Room Management, Voice Expense, Channel Manager, OCR Fix, Hotel Settings, Role Checks
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://galla-manager.preview.emergentagent.com').rstrip('/')

# Test credentials
OWNER_EMAIL = "admin@hotel.com"
OWNER_PASSWORD = "admin123"
STAFF_EMAIL = "staff@hotel.com"
STAFF_PASSWORD = "staff123"


class TestAuthentication:
    """Test authentication for owner and staff"""
    
    def test_owner_login(self):
        """Owner can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "owner"
        assert data["email"] == OWNER_EMAIL
        print(f"✓ Owner login successful: {data['name']}")
    
    def test_staff_login(self):
        """Staff can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["role"] == "staff"
        print(f"✓ Staff login successful: {data['name']}")


@pytest.fixture
def owner_token():
    """Get owner authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": OWNER_EMAIL,
        "password": OWNER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Owner authentication failed")


@pytest.fixture
def staff_token():
    """Get staff authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Staff authentication failed")


@pytest.fixture
def owner_headers(owner_token):
    """Headers with owner auth"""
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


@pytest.fixture
def staff_headers(staff_token):
    """Headers with staff auth"""
    return {"Authorization": f"Bearer {staff_token}", "Content-Type": "application/json"}


class TestHotelSettings:
    """Test hotel settings endpoints"""
    
    def test_get_settings(self, owner_headers):
        """GET /api/settings returns wifi and rules"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert "wifi_name" in data
        assert "wifi_password" in data
        assert "hotel_rules" in data
        print(f"✓ Settings retrieved: WiFi={data.get('wifi_name')}, Rules count={len(data.get('hotel_rules', []))}")
    
    def test_update_settings_owner(self, owner_headers):
        """PUT /api/settings - Owner can update settings"""
        response = requests.put(f"{BASE_URL}/api/settings", headers=owner_headers, json={
            "wifi_name": "TestWiFi",
            "wifi_password": "test1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("wifi_name") == "TestWiFi"
        print("✓ Owner updated settings successfully")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/settings", headers=owner_headers, json={
            "wifi_name": "HotelGuest",
            "wifi_password": "hotel1234"
        })
    
    def test_update_settings_staff_forbidden(self, staff_headers):
        """PUT /api/settings - Staff cannot update settings (403)"""
        response = requests.put(f"{BASE_URL}/api/settings", headers=staff_headers, json={
            "wifi_name": "HackedWiFi"
        })
        assert response.status_code == 403
        print("✓ Staff correctly denied settings update (403)")


class TestChannelManager:
    """Test channel manager endpoints"""
    
    def test_get_channels(self, owner_headers):
        """GET /api/channels returns seeded OTA channels"""
        response = requests.get(f"{BASE_URL}/api/channels", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # 5 seeded OTAs
        channel_names = [c["name"] for c in data]
        assert "OYO" in channel_names
        assert "MakeMyTrip" in channel_names
        assert "Booking.com" in channel_names
        print(f"✓ Channels retrieved: {len(data)} channels including OYO, MakeMyTrip, Booking.com")
    
    def test_create_channel_owner(self, owner_headers):
        """POST /api/channels - Owner can create channel"""
        response = requests.post(f"{BASE_URL}/api/channels", headers=owner_headers, json={
            "name": "TEST_NewChannel",
            "channel_type": "ota",
            "commission_pct": 12,
            "is_active": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_NewChannel"
        assert data["commission_pct"] == 12
        assert "channel_id" in data
        print(f"✓ Channel created: {data['channel_id']}")
        return data["channel_id"]
    
    def test_create_channel_staff_forbidden(self, staff_headers):
        """POST /api/channels - Staff cannot create channel (403)"""
        response = requests.post(f"{BASE_URL}/api/channels", headers=staff_headers, json={
            "name": "StaffChannel",
            "channel_type": "ota",
            "commission_pct": 10
        })
        assert response.status_code == 403
        print("✓ Staff correctly denied channel creation (403)")
    
    def test_toggle_channel(self, owner_headers):
        """PUT /api/channels/{id}?is_active=false - Toggle channel"""
        # Get channels first
        response = requests.get(f"{BASE_URL}/api/channels", headers=owner_headers)
        channels = response.json()
        test_channel = next((c for c in channels if c["name"] == "Agoda"), None)
        if not test_channel:
            pytest.skip("Agoda channel not found")
        
        # Toggle off
        response = requests.put(
            f"{BASE_URL}/api/channels/{test_channel['channel_id']}?is_active=false",
            headers=owner_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == False
        print(f"✓ Channel toggled off: {test_channel['name']}")
        
        # Toggle back on
        requests.put(
            f"{BASE_URL}/api/channels/{test_channel['channel_id']}?is_active=true",
            headers=owner_headers
        )
    
    def test_get_channel_rates(self, owner_headers):
        """GET /api/channels/rates"""
        response = requests.get(f"{BASE_URL}/api/channels/rates", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Channel rates retrieved: {len(data)} rate entries")
    
    def test_set_channel_rate(self, owner_headers):
        """POST /api/channels/rates - Set rate for channel"""
        # Get a channel
        response = requests.get(f"{BASE_URL}/api/channels", headers=owner_headers)
        channels = response.json()
        if not channels:
            pytest.skip("No channels found")
        
        channel = channels[0]
        response = requests.post(f"{BASE_URL}/api/channels/rates", headers=owner_headers, json={
            "channel_id": channel["channel_id"],
            "room_type": "standard",
            "rate": 1200
        })
        assert response.status_code == 200
        print(f"✓ Rate set for {channel['name']}: ₹1200 for standard")
    
    def test_get_channel_bookings(self, owner_headers):
        """GET /api/channels/bookings"""
        response = requests.get(f"{BASE_URL}/api/channels/bookings", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Channel bookings retrieved: {len(data)} bookings")
    
    def test_channel_sync(self, owner_headers):
        """POST /api/channels/sync - Simulate OTA bookings"""
        response = requests.post(f"{BASE_URL}/api/channels/sync", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "synced" in data
        print(f"✓ Channel sync: {data['message']}, synced {len(data.get('synced', []))} bookings")
    
    def test_channel_analytics(self, owner_headers):
        """GET /api/channels/analytics"""
        response = requests.get(f"{BASE_URL}/api/channels/analytics", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert "channels" in data
        assert "summary" in data
        assert "total_revenue" in data["summary"]
        print(f"✓ Channel analytics: {data['summary']['total_bookings']} total bookings, ₹{data['summary']['total_revenue']} revenue")


class TestRoomManagement:
    """Test room management endpoints (Owner only)"""
    
    def test_add_room_owner(self, owner_headers):
        """POST /api/rooms/manage - Owner can add room"""
        response = requests.post(f"{BASE_URL}/api/rooms/manage", headers=owner_headers, json={
            "room_number": 999,
            "floor": 9,
            "room_type": "suite",
            "rate": 2500
        })
        assert response.status_code == 200
        data = response.json()
        assert data["room_number"] == 999
        assert data["floor"] == 9
        assert data["room_type"] == "suite"
        assert data["rate"] == 2500
        print("✓ Room 999 added successfully")
    
    def test_add_room_staff_forbidden(self, staff_headers):
        """POST /api/rooms/manage - Staff cannot add room (403)"""
        response = requests.post(f"{BASE_URL}/api/rooms/manage", headers=staff_headers, json={
            "room_number": 998,
            "floor": 9,
            "room_type": "standard",
            "rate": 1000
        })
        assert response.status_code == 403
        print("✓ Staff correctly denied room creation (403)")
    
    def test_edit_room_owner(self, owner_headers):
        """PUT /api/rooms/manage/{room_number} - Owner can edit room"""
        response = requests.put(f"{BASE_URL}/api/rooms/manage/999", headers=owner_headers, json={
            "rate": 3000,
            "room_type": "deluxe"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["rate"] == 3000
        assert data["room_type"] == "deluxe"
        print("✓ Room 999 edited: rate=3000, type=deluxe")
    
    def test_edit_room_staff_forbidden(self, staff_headers):
        """PUT /api/rooms/manage/{room_number} - Staff cannot edit room (403)"""
        response = requests.put(f"{BASE_URL}/api/rooms/manage/999", headers=staff_headers, json={
            "rate": 5000
        })
        assert response.status_code == 403
        print("✓ Staff correctly denied room edit (403)")
    
    def test_delete_room_owner(self, owner_headers):
        """DELETE /api/rooms/manage/{room_number} - Owner can delete room"""
        response = requests.delete(f"{BASE_URL}/api/rooms/manage/999", headers=owner_headers)
        assert response.status_code == 200
        print("✓ Room 999 deleted successfully")
    
    def test_delete_room_staff_forbidden(self, staff_headers, owner_headers):
        """DELETE /api/rooms/manage/{room_number} - Staff cannot delete room (403)"""
        # First create a room to delete
        requests.post(f"{BASE_URL}/api/rooms/manage", headers=owner_headers, json={
            "room_number": 997,
            "floor": 9,
            "room_type": "standard",
            "rate": 1000
        })
        
        response = requests.delete(f"{BASE_URL}/api/rooms/manage/997", headers=staff_headers)
        assert response.status_code == 403
        print("✓ Staff correctly denied room deletion (403)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/rooms/manage/997", headers=owner_headers)


class TestAutoSendWhatsApp:
    """Test auto-send WhatsApp on check-in"""
    
    def test_checkin_creates_whatsapp_logs(self, owner_headers):
        """POST /api/bookings/checkin creates 3 WhatsApp logs (welcome, wifi, rules)"""
        # Find an available room
        response = requests.get(f"{BASE_URL}/api/rooms", headers=owner_headers)
        rooms = response.json()
        available_room = next((r for r in rooms if r["status"] == "clean"), None)
        if not available_room:
            pytest.skip("No available rooms for check-in test")
        
        room_number = available_room["room_number"]
        
        # Perform check-in
        response = requests.post(f"{BASE_URL}/api/bookings/checkin", headers=owner_headers, json={
            "room_number": room_number,
            "guest_name": "TEST_WhatsAppGuest",
            "guest_phone": "9876543210",
            "aadhar_number": "1234 5678 9012",
            "address": "Test Address",
            "nationality": "Indian",
            "num_guests": 1,
            "rate_per_day": 1000,
            "advance_paid": 500,
            "payment_method": "cash",
            "id_type": "Aadhar",
            "source_channel": "walk-in"
        })
        assert response.status_code == 200
        booking_data = response.json()
        booking_id = booking_data["booking"]["booking_id"]
        print(f"✓ Check-in successful: {booking_id}")
        
        # Check WhatsApp logs
        time.sleep(0.5)  # Small delay for DB write
        response = requests.get(f"{BASE_URL}/api/whatsapp/logs", headers=owner_headers)
        assert response.status_code == 200
        logs = response.json()
        
        # Filter logs for this booking
        booking_logs = [l for l in logs if l.get("booking_id") == booking_id]
        message_types = [l["message_type"] for l in booking_logs]
        
        assert "welcome" in message_types, "Welcome message not found"
        assert "wifi" in message_types, "WiFi message not found"
        assert "rules" in message_types, "Rules message not found"
        
        print(f"✓ WhatsApp logs created: {message_types}")
        
        # Verify content
        wifi_log = next((l for l in booking_logs if l["message_type"] == "wifi"), None)
        assert "HotelGuest" in wifi_log["content"] or "WiFi" in wifi_log["content"]
        
        # Cleanup - checkout
        response = requests.post(f"{BASE_URL}/api/bookings/checkout", headers=owner_headers, json={
            "booking_id": booking_id,
            "payment_method": "cash"
        })
        print(f"✓ Cleanup: Checked out {booking_id}")


class TestVoiceExpense:
    """Test voice expense parsing endpoint"""
    
    def test_voice_expense_parsing(self, owner_headers):
        """POST /api/expenses/voice parses text correctly"""
        test_cases = [
            ("100 rupaye laundry", 100, "laundry"),
            ("200 rupee electricity", 200, "electricity"),
            ("50 pani", 50, "water"),
            ("300 maintenance", 300, "maintenance"),
        ]
        
        for text, expected_amount, expected_category in test_cases:
            response = requests.post(f"{BASE_URL}/api/expenses/voice", headers=owner_headers, json={
                "text": text
            })
            assert response.status_code == 200
            data = response.json()
            assert data["amount"] == expected_amount, f"Expected amount {expected_amount}, got {data['amount']}"
            assert data["category"] == expected_category, f"Expected category {expected_category}, got {data['category']}"
            assert data["source"] == "voice"
            print(f"✓ Voice parsed: '{text}' → ₹{data['amount']} ({data['category']})")


class TestCheckInWithChannel:
    """Test check-in with booking source channel"""
    
    def test_checkin_with_ota_channel(self, owner_headers):
        """POST /api/bookings/checkin with source_channel"""
        # Find an available room
        response = requests.get(f"{BASE_URL}/api/rooms", headers=owner_headers)
        rooms = response.json()
        available_room = next((r for r in rooms if r["status"] == "clean"), None)
        if not available_room:
            pytest.skip("No available rooms")
        
        # Get a channel
        response = requests.get(f"{BASE_URL}/api/channels", headers=owner_headers)
        channels = response.json()
        oyo_channel = next((c for c in channels if c["name"] == "OYO"), None)
        if not oyo_channel:
            pytest.skip("OYO channel not found")
        
        room_number = available_room["room_number"]
        
        # Check-in with OYO as source
        response = requests.post(f"{BASE_URL}/api/bookings/checkin", headers=owner_headers, json={
            "room_number": room_number,
            "guest_name": "TEST_OYOGuest",
            "guest_phone": "9123456789",
            "num_guests": 1,
            "rate_per_day": 1200,
            "advance_paid": 0,
            "payment_method": "upi",
            "source_channel": oyo_channel["channel_id"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["booking"]["source_channel"] == oyo_channel["channel_id"]
        print(f"✓ Check-in with OYO channel: {data['booking']['booking_id']}")
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/bookings/checkout", headers=owner_headers, json={
            "booking_id": data["booking"]["booking_id"],
            "payment_method": "upi"
        })


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_channels(self, owner_headers):
        """Remove TEST_ prefixed channels"""
        response = requests.get(f"{BASE_URL}/api/channels", headers=owner_headers)
        channels = response.json()
        for ch in channels:
            if ch["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/channels/{ch['channel_id']}", headers=owner_headers)
                print(f"✓ Cleaned up channel: {ch['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
