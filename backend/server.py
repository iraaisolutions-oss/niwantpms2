from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import json
import csv
import io

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

# Password utils
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ---------- MODELS ----------
class AuthInput(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    role: Optional[str] = "staff"

class RoomUpdate(BaseModel):
    status: Optional[str] = None
    rate: Optional[float] = None
    room_type: Optional[str] = None

class CheckInInput(BaseModel):
    room_number: int
    guest_name: str
    guest_phone: str
    whatsapp_number: Optional[str] = None
    aadhar_number: Optional[str] = None
    address: Optional[str] = None
    nationality: str = "Indian"
    num_guests: int = 1
    rate_per_day: float
    advance_paid: float = 0
    payment_method: str = "cash"
    check_in_time: Optional[str] = None
    id_type: str = "Aadhar"
    source_channel: str = "walk-in"
    face_photo: Optional[str] = None  # base64 encoded

class CheckOutInput(BaseModel):
    booking_id: str
    payment_method: str = "cash"
    additional_charges: float = 0
    discount: float = 0

class TransactionInput(BaseModel):
    amount: float
    type: str  # cash or upi
    category: str
    description: Optional[str] = None
    booking_id: Optional[str] = None

class ExpenseInput(BaseModel):
    description: str
    amount: float
    category: str

class WhatsAppInput(BaseModel):
    phone: str
    message_type: str
    guest_name: Optional[str] = None
    booking_id: Optional[str] = None

class AdvanceInput(BaseModel):
    booking_id: str
    amount: float
    payment_method: str = "cash"

class ShiftHandoverInput(BaseModel):
    staff_name: Optional[str] = None
    notes: Optional[str] = None

class QRRequestInput(BaseModel):
    room_number: int
    request_type: str  # water, cleaning, bill, towel, other
    details: Optional[str] = None
    guest_name: Optional[str] = None

class VoiceExpenseInput(BaseModel):
    text: str  # e.g., "100 rupaye laundry"

class FreshServiceInput(BaseModel):
    room_number: int
    guest_name: str
    guest_phone: str
    payment_method: str = "cash"

class HotelSettingsInput(BaseModel):
    hotel_name: Optional[str] = None
    wifi_name: Optional[str] = None
    wifi_password: Optional[str] = None
    hotel_rules: Optional[List[str]] = None
    welcome_message: Optional[str] = None
    checkout_message: Optional[str] = None

class RoomCreateInput(BaseModel):
    room_number: int
    floor: int = 1
    room_type: str = "standard"
    rate: float = 1000.0

class RoomEditInput(BaseModel):
    new_room_number: Optional[int] = None
    floor: Optional[int] = None
    room_type: Optional[str] = None
    rate: Optional[float] = None

class ChannelInput(BaseModel):
    name: str
    channel_type: str = "ota"
    commission_pct: float = 0
    is_active: bool = True

class ChannelRateInput(BaseModel):
    channel_id: str
    room_type: str
    rate: float

class ReservationInput(BaseModel):
    room_number: int
    guest_name: str
    guest_phone: str
    whatsapp_number: Optional[str] = None
    check_in_date: str  # YYYY-MM-DD
    num_guests: int = 1
    rate_per_day: float
    advance_paid: float = 0
    payment_method: str = "cash"
    source_channel: str = "walk-in"
    notes: Optional[str] = None

# ---------- AUTH ROUTES ----------
@api_router.post("/auth/register")
async def register(input: AuthInput, response: Response):
    email = input.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "name": input.name or email.split("@")[0],
        "role": input.role if input.role in ["staff", "owner"] else "staff",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email, user_doc["role"])
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": email, "name": user_doc["name"], "role": user_doc["role"], "token": access_token}

@api_router.post("/auth/login")
async def login(input: AuthInput, response: Response):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user["role"])
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": email, "name": user["name"], "role": user["role"], "token": access_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

# ---------- ROOM ROUTES ----------
@api_router.get("/rooms")
async def get_rooms(request: Request):
    await get_current_user(request)
    rooms = await db.rooms.find({}, {"_id": 0}).sort("room_number", 1).to_list(100)
    return rooms

@api_router.put("/rooms/{room_number}")
async def update_room(room_number: int, input: RoomUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {}
    if input.status:
        update_data["status"] = input.status
        update_data["status_changed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["status_changed_by"] = user.get("name", "unknown")
    if input.rate is not None:
        old_room = await db.rooms.find_one({"room_number": room_number}, {"_id": 0})
        if old_room and old_room.get("rate") != input.rate:
            await db.audit_logs.insert_one({
                "action": "rate_change",
                "room_number": room_number,
                "old_rate": old_room.get("rate"),
                "new_rate": input.rate,
                "changed_by": user.get("name"),
                "user_id": user.get("_id"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        update_data["rate"] = input.rate
    if input.room_type:
        update_data["room_type"] = input.room_type
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.rooms.update_one({"room_number": room_number}, {"$set": update_data})
    room = await db.rooms.find_one({"room_number": room_number}, {"_id": 0})
    return room

@api_router.get("/rooms/{room_number}")
async def get_room(room_number: int, request: Request):
    await get_current_user(request)
    room = await db.rooms.find_one({"room_number": room_number}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("current_booking_id"):
        booking = await db.bookings.find_one({"booking_id": room["current_booking_id"]}, {"_id": 0})
        if booking:
            room["current_booking"] = booking
    return room

# ---------- BOOKING / CHECK-IN ----------
def calculate_billing(check_in_dt, check_out_dt, rate_per_day, num_guests, extra_guest_charge=200):
    total_hours = (check_out_dt - check_in_dt).total_seconds() / 3600
    total_days = max(1, int(total_hours / 24))
    remaining_hours = total_hours - (total_days * 24)
    billing_notes = []

    # Nivant Lodge: Overstay beyond 24 hours = full next day charge (no grace)
    if remaining_hours > 0:
        total_days += 1
        billing_notes.append(f"Overstay: {remaining_hours:.1f} hrs beyond {total_days - 1} day(s), full day charged")

    room_charge = total_days * rate_per_day
    extra_charge = max(0, num_guests - 1) * extra_guest_charge * total_days
    if extra_charge > 0:
        billing_notes.append(f"Extra guests: {num_guests - 1} x ₹{extra_guest_charge} x {total_days} days")

    return {
        "total_days": total_days,
        "total_hours": round(total_hours, 1),
        "room_charge": room_charge,
        "extra_guest_charge": extra_charge,
        "total_amount": room_charge + extra_charge,
        "billing_notes": billing_notes
    }

@api_router.post("/bookings/checkin")
async def check_in(input: CheckInInput, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_number": input.room_number}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] == "occupied":
        raise HTTPException(status_code=400, detail="Room is already occupied")

    check_in_time = datetime.now(timezone.utc)
    if input.check_in_time:
        try:
            check_in_time = datetime.fromisoformat(input.check_in_time)
        except ValueError:
            pass

    # Store full Aadhar (unmasked) for Form C compliance
    booking_id = f"BK-{secrets.token_hex(4).upper()}"
    guest_id = f"G-{secrets.token_hex(4).upper()}"

    guest_doc = {
        "guest_id": guest_id,
        "name": input.guest_name,
        "phone": input.guest_phone,
        "whatsapp_number": input.whatsapp_number or input.guest_phone,
        "aadhar_number": input.aadhar_number,
        "face_photo": input.face_photo,
        "address": input.address,
        "nationality": input.nationality,
        "id_type": input.id_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.guests.insert_one(guest_doc)

    booking_doc = {
        "booking_id": booking_id,
        "room_number": input.room_number,
        "guest_id": guest_id,
        "guest_name": input.guest_name,
        "guest_phone": input.guest_phone,
        "num_guests": input.num_guests,
        "check_in": check_in_time.isoformat(),
        "check_out": None,
        "rate_per_day": input.rate_per_day,
        "advance_paid": input.advance_paid,
        "total_paid": input.advance_paid,
        "balance_due": 0,
        "total_amount": 0,
        "payment_method": input.payment_method,
        "status": "active",
        "source_channel": input.source_channel,
        "billing_notes": [],
        "checked_in_by": user.get("name", "unknown"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)

    # Record advance as transaction
    if input.advance_paid > 0:
        await db.transactions.insert_one({
            "transaction_id": f"TX-{secrets.token_hex(4).upper()}",
            "booking_id": booking_id,
            "amount": input.advance_paid,
            "type": input.payment_method,
            "category": "advance",
            "description": f"Advance for Room {input.room_number}",
            "staff_id": user.get("_id"),
            "staff_name": user.get("name"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    # Update room status
    await db.rooms.update_one(
        {"room_number": input.room_number},
        {"$set": {
            "status": "occupied",
            "current_booking_id": booking_id,
            "status_changed_at": datetime.now(timezone.utc).isoformat(),
            "status_changed_by": user.get("name")
        }}
    )

    # Auto-send WhatsApp messages (MOCKED): Welcome + WiFi + Rules + Early Arrival Warning
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    wifi_name = settings.get("wifi_name", "NivantLodge")
    wifi_pass = settings.get("wifi_password", "nivant1234")
    hotel_rules = settings.get("hotel_rules", ["Check-out: 12 PM", "No smoking", "ID required"])
    wa_phone = input.whatsapp_number or input.guest_phone

    await db.whatsapp_logs.insert_one({
        "phone": wa_phone,
        "message_type": "welcome",
        "content": f"Welcome to Nivant Lodge, {input.guest_name}! Room {input.room_number} is ready for you.",
        "status": "mocked_sent",
        "booking_id": booking_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    await db.whatsapp_logs.insert_one({
        "phone": wa_phone,
        "message_type": "wifi",
        "content": f"Wi-Fi Details:\nNetwork: {wifi_name}\nPassword: {wifi_pass}",
        "status": "mocked_sent",
        "booking_id": booking_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    rules_text = "\n".join([f"- {r}" for r in hotel_rules])
    await db.whatsapp_logs.insert_one({
        "phone": wa_phone,
        "message_type": "rules",
        "content": f"Nivant Lodge Rules:\n{rules_text}\n\nIMPORTANT: Do NOT arrive before 12:00 PM. Early arrivals will be charged Rs.500 for a temporary regular room until 12:00 PM.",
        "status": "mocked_sent",
        "booking_id": booking_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    booking_doc.pop("_id", None)
    return {"booking": booking_doc, "guest": {**guest_doc, "_id": None}}

# ---------- CHECK-OUT ----------
@api_router.post("/bookings/checkout")
async def check_out(input: CheckOutInput, request: Request):
    user = await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": input.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "active":
        raise HTTPException(status_code=400, detail="Booking is not active")

    check_out_time = datetime.now(timezone.utc)
    check_in_time = datetime.fromisoformat(booking["check_in"])

    billing = calculate_billing(
        check_in_time, check_out_time,
        booking["rate_per_day"], booking["num_guests"]
    )

    total_with_extras = billing["total_amount"] + input.additional_charges - input.discount
    total_paid = booking.get("total_paid", 0)
    balance_due = max(0, total_with_extras - total_paid)

    await db.bookings.update_one(
        {"booking_id": input.booking_id},
        {"$set": {
            "check_out": check_out_time.isoformat(),
            "status": "completed",
            "total_amount": total_with_extras,
            "balance_due": balance_due,
            "billing_details": billing,
            "additional_charges": input.additional_charges,
            "discount": input.discount,
            "checked_out_by": user.get("name")
        }}
    )

    # Record final payment if balance
    if balance_due > 0:
        await db.transactions.insert_one({
            "transaction_id": f"TX-{secrets.token_hex(4).upper()}",
            "booking_id": input.booking_id,
            "amount": balance_due,
            "type": input.payment_method,
            "category": "checkout_payment",
            "description": f"Checkout Room {booking['room_number']}",
            "staff_id": user.get("_id"),
            "staff_name": user.get("name"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    # Set room to cleaning
    await db.rooms.update_one(
        {"room_number": booking["room_number"]},
        {"$set": {
            "status": "cleaning",
            "current_booking_id": None,
            "status_changed_at": datetime.now(timezone.utc).isoformat(),
            "status_changed_by": user.get("name")
        }}
    )

    # Mock WhatsApp checkout invoice
    await db.whatsapp_logs.insert_one({
        "phone": booking.get("guest_phone"),
        "message_type": "checkout_invoice",
        "content": f"Thank you {booking['guest_name']}! Total: ₹{total_with_extras}. Please leave a review!",
        "status": "mocked_sent",
        "booking_id": input.booking_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "booking_id": input.booking_id,
        "billing": billing,
        "total_amount": total_with_extras,
        "total_paid": total_paid,
        "balance_due": balance_due,
        "room_number": booking["room_number"],
        "guest_name": booking["guest_name"]
    }

# ---------- GET BOOKING BILL PREVIEW ----------
@api_router.get("/bookings/{booking_id}/bill")
async def get_bill_preview(booking_id: str, request: Request):
    await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] == "active":
        check_in_time = datetime.fromisoformat(booking["check_in"])
        billing = calculate_billing(
            check_in_time, datetime.now(timezone.utc),
            booking["rate_per_day"], booking["num_guests"]
        )
        booking["billing_preview"] = billing
        booking["estimated_total"] = billing["total_amount"]
        booking["estimated_balance"] = max(0, billing["total_amount"] - booking.get("total_paid", 0))
    return booking

# ---------- ADVANCE / DEPOSIT ----------
@api_router.post("/bookings/advance")
async def add_advance(input: AdvanceInput, request: Request):
    user = await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": input.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    new_total_paid = booking.get("total_paid", 0) + input.amount
    await db.bookings.update_one(
        {"booking_id": input.booking_id},
        {"$set": {"total_paid": new_total_paid, "advance_paid": booking.get("advance_paid", 0) + input.amount}}
    )
    await db.transactions.insert_one({
        "transaction_id": f"TX-{secrets.token_hex(4).upper()}",
        "booking_id": input.booking_id,
        "amount": input.amount,
        "type": input.payment_method,
        "category": "advance",
        "description": f"Additional advance for Room {booking['room_number']}",
        "staff_id": user.get("_id"),
        "staff_name": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Advance added", "new_total_paid": new_total_paid}

# ---------- TRANSACTIONS / GALLA ----------
@api_router.get("/transactions")
async def get_transactions(request: Request, date: Optional[str] = None, shift: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if date:
        query["timestamp"] = {"$regex": f"^{date}"}
    txns = await db.transactions.find(query, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return txns

@api_router.post("/transactions")
async def add_transaction(input: TransactionInput, request: Request):
    user = await get_current_user(request)
    doc = {
        "transaction_id": f"TX-{secrets.token_hex(4).upper()}",
        "booking_id": input.booking_id,
        "amount": input.amount,
        "type": input.type,
        "category": input.category,
        "description": input.description,
        "staff_id": user.get("_id"),
        "staff_name": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/galla/summary")
async def get_galla_summary(request: Request, date: Optional[str] = None):
    user = await get_current_user(request)
    today = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    txns = await db.transactions.find(
        {"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}
    ).to_list(1000)
    cash_total = sum(t["amount"] for t in txns if t.get("type") == "cash")
    upi_total = sum(t["amount"] for t in txns if t.get("type") == "upi")
    expenses = await db.expenses.find(
        {"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}
    ).to_list(500)
    expense_total = sum(e["amount"] for e in expenses)
    return {
        "date": today,
        "cash_collected": cash_total,
        "upi_collected": upi_total,
        "total_collected": cash_total + upi_total,
        "total_expenses": expense_total,
        "net_amount": cash_total + upi_total - expense_total,
        "transaction_count": len(txns),
        "transactions": txns,
        "expenses": expenses
    }

# ---------- EXPENSES ----------
@api_router.get("/expenses")
async def get_expenses(request: Request, date: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if date:
        query["timestamp"] = {"$regex": f"^{date}"}
    expenses = await db.expenses.find(query, {"_id": 0}).sort("timestamp", -1).to_list(500)
    return expenses

@api_router.post("/expenses")
async def add_expense(input: ExpenseInput, request: Request):
    user = await get_current_user(request)
    doc = {
        "expense_id": f"EX-{secrets.token_hex(4).upper()}",
        "description": input.description,
        "amount": input.amount,
        "category": input.category,
        "staff_id": user.get("_id"),
        "staff_name": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ---------- WHATSAPP ENGINE (MOCKED) ----------
@api_router.post("/whatsapp/send")
async def send_whatsapp(input: WhatsAppInput, request: Request):
    user = await get_current_user(request)
    content = ""
    if input.message_type == "welcome":
        content = f"🏨 Welcome {input.guest_name}! Your room is ready. Wi-Fi: HotelGuest / Pass: hotel1234"
    elif input.message_type == "checkout":
        content = f"Thank you {input.guest_name}! We hope you enjoyed your stay. Please leave a Google review!"
    elif input.message_type == "wifi":
        content = "📶 Wi-Fi: HotelGuest | Password: hotel1234"
    elif input.message_type == "custom":
        content = f"Message to {input.phone}"
    else:
        content = f"{input.message_type} message"

    doc = {
        "phone": input.phone,
        "message_type": input.message_type,
        "content": content,
        "status": "mocked_sent",
        "booking_id": input.booking_id,
        "sent_by": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.whatsapp_logs.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "mocked_sent", "message": content, "log": doc}

@api_router.get("/whatsapp/logs")
async def get_whatsapp_logs(request: Request):
    await get_current_user(request)
    logs = await db.whatsapp_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    return logs

# ---------- FORM C EXPORT ----------
@api_router.get("/formc/export")
async def export_form_c(request: Request, from_date: Optional[str] = None, to_date: Optional[str] = None):
    await get_current_user(request)
    query = {"status": {"$in": ["active", "completed"]}}
    bookings = await db.bookings.find(query, {"_id": 0}).sort("check_in", -1).to_list(1000)
    guest_ids = [b.get("guest_id") for b in bookings if b.get("guest_id")]
    guests_map = {}
    if guest_ids:
        guests = await db.guests.find({"guest_id": {"$in": guest_ids}}, {"_id": 0}).to_list(1000)
        guests_map = {g["guest_id"]: g for g in guests}

    records = []
    for b in bookings:
        guest = guests_map.get(b.get("guest_id"), {})
        records.append({
            "sr_no": len(records) + 1,
            "guest_name": b.get("guest_name", ""),
            "phone": b.get("guest_phone", ""),
            "aadhar_number": guest.get("aadhar_number", ""),
            "address": guest.get("address", ""),
            "nationality": guest.get("nationality", "Indian"),
            "room_number": b.get("room_number"),
            "num_guests": b.get("num_guests", 1),
            "check_in": b.get("check_in", ""),
            "check_out": b.get("check_out", ""),
            "id_type": guest.get("id_type", "Aadhar"),
            "purpose_of_visit": "Tourism",
            "arrived_from": guest.get("address", ""),
            "next_destination": ""
        })

    # Generate CSV
    output = io.StringIO()
    if records:
        writer = csv.DictWriter(output, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    
    await db.form_c_exports.insert_one({
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "guest_count": len(records),
        "format": "csv"
    })

    return {"records": records, "csv_data": output.getvalue(), "total_guests": len(records)}

# ---------- OWNER ANALYTICS ----------
@api_router.get("/analytics/occupancy")
async def get_occupancy_analytics(request: Request):
    user = await get_current_user(request)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    total = len(rooms)
    occupied = sum(1 for r in rooms if r["status"] == "occupied")
    cleaning = sum(1 for r in rooms if r["status"] == "cleaning")
    available = sum(1 for r in rooms if r["status"] == "clean")

    # Get last 30 days bookings for heatmap
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    bookings = await db.bookings.find(
        {"check_in": {"$gte": thirty_days_ago}}, {"_id": 0}
    ).to_list(1000)

    daily_counts = {}
    for b in bookings:
        day = b["check_in"][:10]
        daily_counts[day] = daily_counts.get(day, 0) + 1

    return {
        "total_rooms": total,
        "occupied": occupied,
        "cleaning": cleaning,
        "available": available,
        "occupancy_rate": round((occupied / total) * 100, 1) if total > 0 else 0,
        "daily_bookings": daily_counts
    }

@api_router.get("/analytics/revenue")
async def get_revenue_analytics(request: Request):
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    month_start = today[:7]  # YYYY-MM

    today_txns = await db.transactions.find({"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}).to_list(1000)
    month_txns = await db.transactions.find({"timestamp": {"$regex": f"^{month_start}"}}, {"_id": 0}).to_list(5000)

    today_revenue = sum(t["amount"] for t in today_txns)
    month_revenue = sum(t["amount"] for t in month_txns)

    today_expenses = await db.expenses.find({"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}).to_list(500)
    month_expenses = await db.expenses.find({"timestamp": {"$regex": f"^{month_start}"}}, {"_id": 0}).to_list(5000)

    return {
        "today_revenue": today_revenue,
        "month_revenue": month_revenue,
        "today_expenses": sum(e["amount"] for e in today_expenses),
        "month_expenses": sum(e["amount"] for e in month_expenses),
        "today_net": today_revenue - sum(e["amount"] for e in today_expenses),
        "month_net": month_revenue - sum(e["amount"] for e in month_expenses)
    }

@api_router.get("/analytics/leakage")
async def get_revenue_leakage(request: Request):
    user = await get_current_user(request)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    alerts = []
    for r in rooms:
        if r["status"] == "cleaning" and r.get("status_changed_at"):
            changed = datetime.fromisoformat(r["status_changed_at"])
            hours_in_cleaning = (datetime.now(timezone.utc) - changed).total_seconds() / 3600
            if hours_in_cleaning > 10:
                alerts.append({
                    "room_number": r["room_number"],
                    "status": "cleaning",
                    "hours_in_status": round(hours_in_cleaning, 1),
                    "alert": "Room in cleaning for over 10 hours - possible revenue leakage"
                })
    audit_logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return {"alerts": alerts, "recent_audit_logs": audit_logs}

@api_router.get("/analytics/staff")
async def get_staff_analytics(request: Request):
    user = await get_current_user(request)
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    staff_stats = {}
    for b in bookings:
        staff = b.get("checked_in_by", "unknown")
        if staff not in staff_stats:
            staff_stats[staff] = {"check_ins": 0, "name": staff}
        staff_stats[staff]["check_ins"] += 1
    return {"staff_stats": list(staff_stats.values())}

# ---------- ACTIVE BOOKINGS ----------
@api_router.get("/bookings/active")
async def get_active_bookings(request: Request):
    await get_current_user(request)
    bookings = await db.bookings.find({"status": "active"}, {"_id": 0}).to_list(100)
    return bookings

@api_router.get("/bookings")
async def get_all_bookings(request: Request, status: Optional[str] = None):
    await get_current_user(request)
    query = {}
    if status:
        query["status"] = status
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return bookings

# ---------- SHIFT HANDOVER / REMOTE CASHBOX ----------
@api_router.post("/galla/shift-handover")
async def shift_handover(input: ShiftHandoverInput, request: Request):
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    txns = await db.transactions.find({"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}).to_list(500)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    
    cash_total = sum(t["amount"] for t in txns if t.get("type") == "cash")
    upi_total = sum(t["amount"] for t in txns if t.get("type") == "upi")
    expense_total = sum(e["amount"] for e in expenses)
    occupied = sum(1 for r in rooms if r["status"] == "occupied")
    
    summary = {
        "handover_id": f"SH-{secrets.token_hex(4).upper()}",
        "date": today,
        "staff_name": input.staff_name or user.get("name", "unknown"),
        "cash_collected": cash_total,
        "upi_collected": upi_total,
        "total_collected": cash_total + upi_total,
        "total_expenses": expense_total,
        "net_amount": cash_total + upi_total - expense_total,
        "rooms_occupied": occupied,
        "rooms_total": len(rooms),
        "transaction_count": len(txns),
        "expense_count": len(expenses),
        "notes": input.notes or "",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "handed_over_by": user.get("name")
    }
    
    await db.shift_handovers.insert_one({**summary})
    summary.pop("_id", None)
    
    # Mock WhatsApp to owner
    owner = await db.users.find_one({"role": "owner"}, {"_id": 0})
    msg = (
        f"📊 शिफ्ट सारांश / Shift Summary\n"
        f"📅 {today}\n"
        f"👤 Staff: {summary['staff_name']}\n"
        f"💰 रोख/Cash: ₹{cash_total}\n"
        f"📱 UPI: ₹{upi_total}\n"
        f"📈 एकूण/Total: ₹{cash_total + upi_total}\n"
        f"📉 खर्च/Expenses: ₹{expense_total}\n"
        f"💵 निव्वळ/Net: ₹{cash_total + upi_total - expense_total}\n"
        f"🏨 भरलेल्या/Occupied: {occupied}/{len(rooms)}\n"
        f"📝 {input.notes or 'No notes'}"
    )
    
    await db.whatsapp_logs.insert_one({
        "phone": "owner",
        "message_type": "shift_handover",
        "content": msg,
        "status": "mocked_sent",
        "booking_id": None,
        "sent_by": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"summary": summary, "whatsapp_sent": True, "message": msg}

@api_router.get("/galla/remote")
async def get_remote_cashbox(request: Request):
    """Owner's Remote Cashbox - live view from anywhere"""
    user = await get_current_user(request)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    txns = await db.transactions.find({"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({"timestamp": {"$regex": f"^{today}"}}, {"_id": 0}).to_list(500)
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    active_bookings = await db.bookings.find({"status": "active"}, {"_id": 0}).to_list(100)
    
    cash_total = sum(t["amount"] for t in txns if t.get("type") == "cash")
    upi_total = sum(t["amount"] for t in txns if t.get("type") == "upi")
    expense_total = sum(e["amount"] for e in expenses)
    occupied = sum(1 for r in rooms if r["status"] == "occupied")
    cleaning = sum(1 for r in rooms if r["status"] == "cleaning")
    
    # Last 5 handovers
    handovers = await db.shift_handovers.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5)
    
    return {
        "live_galla": {
            "date": today,
            "cash_in_register": cash_total,
            "upi_collected": upi_total,
            "total_collected": cash_total + upi_total,
            "total_expenses": expense_total,
            "net_cash": cash_total + upi_total - expense_total,
        },
        "hotel_status": {
            "occupied": occupied,
            "cleaning": cleaning,
            "available": len(rooms) - occupied - cleaning,
            "total_rooms": len(rooms),
            "occupancy_pct": round((occupied / len(rooms)) * 100, 1) if rooms else 0
        },
        "active_bookings": [{
            "room_number": b["room_number"],
            "guest_name": b["guest_name"],
            "rate": b["rate_per_day"],
            "check_in": b["check_in"],
            "advance": b.get("advance_paid", 0)
        } for b in active_bookings],
        "recent_transactions": txns[-10:] if txns else [],
        "recent_expenses": expenses[-5:] if expenses else [],
        "shift_handovers": handovers
    }

@api_router.get("/galla/daily-summary")
async def get_daily_auto_summary(request: Request, date: Optional[str] = None):
    """Auto-generated daily summary for owner WhatsApp"""
    user = await get_current_user(request)
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    txns = await db.transactions.find({"timestamp": {"$regex": f"^{target_date}"}}, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find({"timestamp": {"$regex": f"^{target_date}"}}, {"_id": 0}).to_list(500)
    bookings_today = await db.bookings.find({"created_at": {"$regex": f"^{target_date}"}}, {"_id": 0}).to_list(100)
    completed_today = await db.bookings.find({"check_out": {"$regex": f"^{target_date}"}}, {"_id": 0}).to_list(100)
    
    cash_total = sum(t["amount"] for t in txns if t.get("type") == "cash")
    upi_total = sum(t["amount"] for t in txns if t.get("type") == "upi")
    expense_total = sum(e["amount"] for e in expenses)
    
    summary_msg = (
        f"🏨 डेली रिपोर्ट / Daily Report\n"
        f"📅 {target_date}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"💰 रोख/Cash: ₹{cash_total}\n"
        f"📱 UPI: ₹{upi_total}\n"
        f"📈 एकूण जमा/Total: ₹{cash_total + upi_total}\n"
        f"📉 खर्च/Expenses: ₹{expense_total}\n"
        f"💵 निव्वळ/Net: ₹{cash_total + upi_total - expense_total}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🔑 चेक-इन/Check-ins: {len(bookings_today)}\n"
        f"🚪 चेक-आउट/Check-outs: {len(completed_today)}\n"
        f"💳 व्यवहार/Transactions: {len(txns)}\n"
    )
    
    # Mock send to owner via WhatsApp
    await db.whatsapp_logs.insert_one({
        "phone": "owner",
        "message_type": "daily_summary",
        "content": summary_msg,
        "status": "mocked_sent",
        "booking_id": None,
        "sent_by": "system",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "date": target_date,
        "cash": cash_total,
        "upi": upi_total,
        "total": cash_total + upi_total,
        "expenses": expense_total,
        "net": cash_total + upi_total - expense_total,
        "check_ins": len(bookings_today),
        "check_outs": len(completed_today),
        "transactions": len(txns),
        "message": summary_msg,
        "whatsapp_sent": True
    }

# ---------- QR DIGITAL BELL (Public for guests) ----------
@api_router.post("/qr/request")
async def create_qr_request(input: QRRequestInput):
    """Guest-facing: no auth needed. Guest scans QR in room."""
    room = await db.rooms.find_one({"room_number": input.room_number}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    req_doc = {
        "request_id": f"QR-{secrets.token_hex(4).upper()}",
        "room_number": input.room_number,
        "request_type": input.request_type,
        "details": input.details,
        "guest_name": input.guest_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None,
        "resolved_by": None
    }
    await db.qr_requests.insert_one(req_doc)
    req_doc.pop("_id", None)
    return req_doc

@api_router.get("/qr/requests")
async def get_qr_requests(request: Request, status: Optional[str] = None):
    """Staff-facing: view pending requests"""
    await get_current_user(request)
    query = {}
    if status:
        query["status"] = status
    requests = await db.qr_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.put("/qr/requests/{request_id}")
async def resolve_qr_request(request_id: str, request: Request):
    """Staff resolves a guest request"""
    user = await get_current_user(request)
    result = await db.qr_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": user.get("name")
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request resolved", "request_id": request_id}

# ---------- VOICE EXPENSE PARSING ----------
@api_router.post("/expenses/voice")
async def add_voice_expense(input: VoiceExpenseInput, request: Request):
    """Parse voice text like '100 rupaye laundry' into expense"""
    user = await get_current_user(request)
    import re
    text = input.text.strip().lower()
    
    # Extract amount (numbers in the text)
    amount_match = re.search(r'(\d+)', text)
    amount = float(amount_match.group(1)) if amount_match else 0
    
    # Category detection
    category_map = {
        'laundry': ['laundry', 'dhulai', 'कपडे', 'धुलाई', 'wash'],
        'electricity': ['electricity', 'bijli', 'वीज', 'light', 'current'],
        'water': ['water', 'pani', 'पाणी'],
        'maintenance': ['maintenance', 'repair', 'fix', 'दुरुस्ती', 'देखभाल'],
        'supplies': ['supplies', 'soap', 'towel', 'पुरवठा', 'साबण'],
        'other': []
    }
    
    detected_category = 'other'
    for cat, keywords in category_map.items():
        for kw in keywords:
            if kw in text:
                detected_category = cat
                break
    
    # Remove amount from text to get description
    description = re.sub(r'\d+\s*(rupaye|rupee|rs|₹)?\s*', '', text).strip()
    if not description:
        description = text
    
    doc = {
        "expense_id": f"EX-{secrets.token_hex(4).upper()}",
        "description": description or text,
        "amount": amount,
        "category": detected_category,
        "source": "voice",
        "original_text": input.text,
        "staff_id": user.get("_id"),
        "staff_name": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc

# ---------- HOTEL SETTINGS ----------
@api_router.get("/settings")
async def get_settings(request: Request):
    await get_current_user(request)
    settings = await db.settings.find_one({}, {"_id": 0})
    return settings or {}

@api_router.put("/settings")
async def update_settings(input: HotelSettingsInput, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    update = {k: v for k, v in input.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.settings.update_one({}, {"$set": update}, upsert=True)
    settings = await db.settings.find_one({}, {"_id": 0})
    return settings

# ---------- ROOM MANAGEMENT (Owner) ----------
@api_router.post("/rooms/manage")
async def add_room(input: RoomCreateInput, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    existing = await db.rooms.find_one({"room_number": input.room_number})
    if existing:
        raise HTTPException(status_code=400, detail="Room number already exists")
    room_doc = {
        "room_number": input.room_number,
        "floor": input.floor,
        "room_type": input.room_type,
        "status": "clean",
        "rate": input.rate,
        "current_booking_id": None,
        "status_changed_at": datetime.now(timezone.utc).isoformat(),
        "status_changed_by": user.get("name")
    }
    await db.rooms.insert_one(room_doc)
    room_doc.pop("_id", None)
    return room_doc

@api_router.put("/rooms/manage/{room_number}")
async def edit_room(room_number: int, input: RoomEditInput, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    room = await db.rooms.find_one({"room_number": room_number})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    update = {}
    if input.floor is not None:
        update["floor"] = input.floor
    if input.room_type is not None:
        update["room_type"] = input.room_type
    if input.rate is not None:
        update["rate"] = input.rate
    if input.new_room_number is not None and input.new_room_number != room_number:
        dup = await db.rooms.find_one({"room_number": input.new_room_number})
        if dup:
            raise HTTPException(status_code=400, detail="New room number already exists")
        update["room_number"] = input.new_room_number
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.rooms.update_one({"room_number": room_number}, {"$set": update})
    updated = await db.rooms.find_one({"room_number": update.get("room_number", room_number)}, {"_id": 0})
    return updated

@api_router.delete("/rooms/manage/{room_number}")
async def delete_room(room_number: int, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    room = await db.rooms.find_one({"room_number": room_number})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("status") == "occupied":
        raise HTTPException(status_code=400, detail="Cannot delete occupied room")
    await db.rooms.delete_one({"room_number": room_number})
    return {"message": f"Room {room_number} deleted"}

# ---------- CHANNEL MANAGER ----------
@api_router.get("/channels")
async def get_channels(request: Request):
    await get_current_user(request)
    channels = await db.channels.find({}, {"_id": 0}).to_list(50)
    return channels

@api_router.post("/channels")
async def create_channel(input: ChannelInput, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    channel_id = f"CH-{secrets.token_hex(4).upper()}"
    doc = {
        "channel_id": channel_id,
        "name": input.name,
        "channel_type": input.channel_type,
        "commission_pct": input.commission_pct,
        "is_active": input.is_active,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.channels.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/channels/{channel_id}")
async def update_channel(channel_id: str, request: Request, name: Optional[str] = None, channel_type: Optional[str] = None, commission_pct: Optional[float] = None, is_active: Optional[bool] = None):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    update = {}
    if name is not None:
        update["name"] = name
    if channel_type is not None:
        update["channel_type"] = channel_type
    if commission_pct is not None:
        update["commission_pct"] = commission_pct
    if is_active is not None:
        update["is_active"] = is_active
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.channels.update_one({"channel_id": channel_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel = await db.channels.find_one({"channel_id": channel_id}, {"_id": 0})
    return channel

@api_router.delete("/channels/{channel_id}")
async def delete_channel(channel_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    result = await db.channels.delete_one({"channel_id": channel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"message": "Channel deleted"}

@api_router.get("/channels/rates")
async def get_channel_rates(request: Request):
    await get_current_user(request)
    rates = await db.channel_rates.find({}, {"_id": 0}).to_list(200)
    return rates

@api_router.post("/channels/rates")
async def set_channel_rate(input: ChannelRateInput, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    await db.channel_rates.update_one(
        {"channel_id": input.channel_id, "room_type": input.room_type},
        {"$set": {
            "channel_id": input.channel_id,
            "room_type": input.room_type,
            "rate": input.rate,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Rate updated"}

@api_router.get("/channels/bookings")
async def get_channel_bookings(request: Request, channel_id: Optional[str] = None):
    await get_current_user(request)
    query = {}
    if channel_id:
        query["source_channel"] = channel_id
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return bookings

@api_router.post("/channels/sync")
async def simulate_channel_sync(request: Request):
    """Simulate receiving bookings from OTA channels"""
    import random
    user = await get_current_user(request)
    channels = await db.channels.find({"is_active": True, "channel_type": "ota"}, {"_id": 0}).to_list(20)
    if not channels:
        return {"message": "No active OTA channels", "synced": []}
    available_rooms = await db.rooms.find({"status": "clean"}, {"_id": 0}).to_list(100)
    if not available_rooms:
        return {"message": "No available rooms", "synced": []}

    names = ["Rahul Sharma", "Priya Patel", "Amit Kumar", "Sneha Reddy", "Vikram Singh", "Anita Desai", "Rohan Mehta", "Kavita Joshi"]
    synced = []
    num_bookings = min(random.randint(1, 3), len(available_rooms))

    for i in range(num_bookings):
        channel = random.choice(channels)
        room = available_rooms[i]
        channel_rate = await db.channel_rates.find_one(
            {"channel_id": channel["channel_id"], "room_type": room["room_type"]}, {"_id": 0}
        )
        rate = channel_rate["rate"] if channel_rate else room["rate"]
        booking_id = f"BK-{secrets.token_hex(4).upper()}"
        guest_name = random.choice(names)
        guest_phone = f"9{random.randint(100000000, 999999999)}"

        booking_doc = {
            "booking_id": booking_id,
            "room_number": room["room_number"],
            "guest_name": guest_name,
            "guest_phone": guest_phone,
            "num_guests": random.randint(1, 2),
            "check_in": datetime.now(timezone.utc).isoformat(),
            "check_out": None,
            "rate_per_day": rate,
            "advance_paid": 0,
            "total_paid": 0,
            "balance_due": 0,
            "total_amount": 0,
            "payment_method": "upi",
            "status": "active",
            "source_channel": channel["channel_id"],
            "source_channel_name": channel["name"],
            "channel_ref": f"{channel['name'][:3].upper()}-{secrets.token_hex(3).upper()}",
            "commission_pct": channel.get("commission_pct", 0),
            "billing_notes": [],
            "checked_in_by": "OTA Sync",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.bookings.insert_one(booking_doc)
        await db.rooms.update_one(
            {"room_number": room["room_number"]},
            {"$set": {
                "status": "occupied",
                "current_booking_id": booking_id,
                "status_changed_at": datetime.now(timezone.utc).isoformat(),
                "status_changed_by": "OTA Sync"
            }}
        )
        booking_doc.pop("_id", None)
        synced.append(booking_doc)

    return {"message": f"Synced {len(synced)} bookings", "synced": synced}

@api_router.get("/channels/analytics")
async def get_channel_analytics(request: Request):
    await get_current_user(request)
    channels = await db.channels.find({}, {"_id": 0}).to_list(50)
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(5000)

    channel_map = {c["channel_id"]: c for c in channels}
    channel_map["walk-in"] = {"channel_id": "walk-in", "name": "Walk-in", "commission_pct": 0}

    analytics = {}
    for ch_id, ch in channel_map.items():
        ch_bookings = [b for b in bookings if b.get("source_channel", "walk-in") == ch_id]
        total_revenue = sum(b.get("total_amount", 0) for b in ch_bookings)
        commission = total_revenue * ch.get("commission_pct", 0) / 100
        analytics[ch_id] = {
            "channel_id": ch_id,
            "channel_name": ch["name"],
            "total_bookings": len(ch_bookings),
            "active_bookings": sum(1 for b in ch_bookings if b["status"] == "active"),
            "completed_bookings": sum(1 for b in ch_bookings if b["status"] == "completed"),
            "total_revenue": total_revenue,
            "commission": round(commission, 2),
            "net_revenue": round(total_revenue - commission, 2),
            "commission_pct": ch.get("commission_pct", 0)
        }

    total_revenue = sum(a["total_revenue"] for a in analytics.values())
    total_commission = sum(a["commission"] for a in analytics.values())

    return {
        "channels": list(analytics.values()),
        "summary": {
            "total_revenue": total_revenue,
            "total_commission": round(total_commission, 2),
            "net_revenue": round(total_revenue - total_commission, 2),
            "total_bookings": sum(a["total_bookings"] for a in analytics.values()),
            "channel_count": len(analytics)
        }
    }

# ---------- PDF INVOICE ----------
@api_router.get("/bookings/{booking_id}/invoice")
async def get_invoice(booking_id: str, request: Request):
    await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    guest = await db.guests.find_one({"guest_id": booking.get("guest_id")}, {"_id": 0})
    
    # Calculate billing if active
    billing = booking.get("billing_details")
    if not billing and booking["status"] == "active":
        check_in_time = datetime.fromisoformat(booking["check_in"])
        billing = calculate_billing(
            check_in_time, datetime.now(timezone.utc),
            booking["rate_per_day"], booking["num_guests"]
        )
    
    invoice = {
        "invoice_id": f"INV-{booking_id}",
        "booking_id": booking_id,
        "hotel_name": "Nivant Lodge",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "guest": {
            "name": booking.get("guest_name"),
            "phone": booking.get("guest_phone"),
            "aadhar": guest.get("aadhar_number") if guest else None,
            "address": guest.get("address") if guest else None,
        },
        "room_number": booking["room_number"],
        "check_in": booking["check_in"],
        "check_out": booking.get("check_out"),
        "rate_per_day": booking["rate_per_day"],
        "num_guests": booking["num_guests"],
        "billing": billing,
        "additional_charges": booking.get("additional_charges", 0),
        "discount": booking.get("discount", 0),
        "total_amount": booking.get("total_amount", billing.get("total_amount", 0) if billing else 0),
        "advance_paid": booking.get("advance_paid", 0),
        "total_paid": booking.get("total_paid", 0),
        "balance_due": booking.get("balance_due", 0),
        "payment_method": booking.get("payment_method"),
        "status": booking["status"]
    }
    return invoice

# ---------- GUEST SEARCH (for returning customers) ----------
@api_router.get("/guests/search")
async def search_guests(request: Request, q: str = ""):
    await get_current_user(request)
    if not q or len(q) < 2:
        return []
    guests = await db.guests.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q}}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    seen = set()
    unique = []
    for g in guests:
        key = g.get("phone", "")
        if key and key not in seen:
            seen.add(key)
            unique.append(g)
    return unique[:10]

# ---------- RESERVATIONS (Future Bookings) ----------
@api_router.post("/bookings/reserve")
async def create_reservation(input: ReservationInput, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_number": input.room_number}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    existing = await db.bookings.find_one({
        "room_number": input.room_number,
        "check_in_date": input.check_in_date,
        "status": "reserved"
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Room {input.room_number} already reserved for {input.check_in_date}")

    booking_id = f"RV-{secrets.token_hex(4).upper()}"
    booking_doc = {
        "booking_id": booking_id,
        "room_number": input.room_number,
        "guest_name": input.guest_name,
        "guest_phone": input.guest_phone,
        "whatsapp_number": input.whatsapp_number or input.guest_phone,
        "num_guests": input.num_guests,
        "check_in_date": input.check_in_date,
        "check_in": None,
        "check_out": None,
        "rate_per_day": input.rate_per_day,
        "advance_paid": input.advance_paid,
        "total_paid": input.advance_paid,
        "balance_due": 0,
        "total_amount": 0,
        "payment_method": input.payment_method,
        "status": "reserved",
        "source_channel": input.source_channel,
        "notes": input.notes,
        "billing_notes": [],
        "reserved_by": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)

    if input.advance_paid > 0:
        await db.transactions.insert_one({
            "transaction_id": f"TX-{secrets.token_hex(4).upper()}",
            "booking_id": booking_id,
            "amount": input.advance_paid,
            "type": input.payment_method,
            "category": "reservation_advance",
            "description": f"Reservation advance - Room {input.room_number} for {input.check_in_date}",
            "staff_id": user.get("_id"),
            "staff_name": user.get("name"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    hotel_rules = settings.get("hotel_rules", [])
    wa_phone = input.whatsapp_number or input.guest_phone
    rules_text = "\n".join([f"- {r}" for r in hotel_rules])
    await db.whatsapp_logs.insert_one({
        "phone": wa_phone,
        "message_type": "reservation_confirmation",
        "content": f"Booking Confirmed!\nNivant Lodge\nRoom: {input.room_number}\nDate: {input.check_in_date}\nGuest: {input.guest_name}\nRate: Rs.{input.rate_per_day}/day\n\nRules:\n{rules_text}\n\nIMPORTANT: Do NOT arrive before 12:00 PM.",
        "status": "mocked_sent",
        "booking_id": booking_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    booking_doc.pop("_id", None)
    return booking_doc

@api_router.get("/bookings/reservations")
async def get_reservations(request: Request, date: Optional[str] = None):
    await get_current_user(request)
    query = {"status": "reserved"}
    if date:
        query["check_in_date"] = date
    reservations = await db.bookings.find(query, {"_id": 0}).sort("check_in_date", 1).to_list(200)
    return reservations

@api_router.post("/bookings/reserve/{booking_id}/checkin")
async def checkin_reservation(booking_id: str, request: Request):
    user = await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if booking["status"] != "reserved":
        raise HTTPException(status_code=400, detail="Not a reserved booking")
    room = await db.rooms.find_one({"room_number": booking["room_number"]}, {"_id": 0})
    if room and room["status"] == "occupied":
        raise HTTPException(status_code=400, detail="Room is currently occupied")

    check_in_time = datetime.now(timezone.utc)
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "status": "active",
            "check_in": check_in_time.isoformat(),
            "checked_in_by": user.get("name")
        }}
    )
    await db.rooms.update_one(
        {"room_number": booking["room_number"]},
        {"$set": {
            "status": "occupied",
            "current_booking_id": booking_id,
            "status_changed_at": check_in_time.isoformat(),
            "status_changed_by": user.get("name")
        }}
    )

    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    wifi_name = settings.get("wifi_name", "NivantLodge")
    wifi_pass = settings.get("wifi_password", "nivant1234")
    wa_phone = booking.get("whatsapp_number") or booking.get("guest_phone")
    await db.whatsapp_logs.insert_one({
        "phone": wa_phone,
        "message_type": "welcome",
        "content": f"Welcome to Nivant Lodge, {booking['guest_name']}! Room {booking['room_number']} is ready.\nWi-Fi: {wifi_name} / {wifi_pass}",
        "status": "mocked_sent",
        "booking_id": booking_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {"message": "Checked in", "booking_id": booking_id, "room_number": booking["room_number"]}

@api_router.post("/bookings/reserve/{booking_id}/cancel")
async def cancel_reservation(booking_id: str, request: Request):
    user = await get_current_user(request)
    booking = await db.bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Reservation not found")
    if booking["status"] != "reserved":
        raise HTTPException(status_code=400, detail="Not a reserved booking")
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_by": user.get("name"),
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Reservation cancelled", "booking_id": booking_id}

@api_router.get("/bookings/calendar")
async def get_booking_calendar(request: Request, month: Optional[str] = None):
    await get_current_user(request)
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    reservations = await db.bookings.find(
        {"check_in_date": {"$regex": f"^{month}"}, "status": "reserved"},
        {"_id": 0}
    ).to_list(500)
    active = await db.bookings.find(
        {"check_in": {"$regex": f"^{month}"}, "status": "active"},
        {"_id": 0}
    ).to_list(500)
    days = {}
    for r in reservations:
        date = r.get("check_in_date", "")
        if date not in days:
            days[date] = {"reservations": [], "active": []}
        days[date]["reservations"].append({
            "booking_id": r["booking_id"], "room_number": r["room_number"],
            "guest_name": r["guest_name"], "rate": r["rate_per_day"],
            "advance": r.get("advance_paid", 0), "source": r.get("source_channel", "walk-in")
        })
    for a in active:
        date = a.get("check_in", "")[:10]
        if date not in days:
            days[date] = {"reservations": [], "active": []}
        days[date]["active"].append({
            "booking_id": a["booking_id"], "room_number": a["room_number"],
            "guest_name": a["guest_name"]
        })
    return {"month": month, "days": days}

# ---------- FRESH SERVICE (30 min, ₹200) ----------
@api_router.post("/bookings/fresh")
async def fresh_service(input: FreshServiceInput, request: Request):
    user = await get_current_user(request)
    room = await db.rooms.find_one({"room_number": input.room_number}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["status"] == "occupied":
        raise HTTPException(status_code=400, detail="Room is occupied")

    booking_id = f"FR-{secrets.token_hex(4).upper()}"
    booking_doc = {
        "booking_id": booking_id,
        "room_number": input.room_number,
        "guest_name": input.guest_name,
        "guest_phone": input.guest_phone,
        "booking_type": "fresh",
        "num_guests": 1,
        "check_in": datetime.now(timezone.utc).isoformat(),
        "check_out": None,
        "rate_per_day": 200,
        "total_amount": 200,
        "advance_paid": 200,
        "total_paid": 200,
        "balance_due": 0,
        "payment_method": input.payment_method,
        "status": "active",
        "source_channel": "walk-in",
        "billing_notes": ["Fresh Service - 30 minutes - ₹200"],
        "checked_in_by": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)
    await db.transactions.insert_one({
        "transaction_id": f"TX-{secrets.token_hex(4).upper()}",
        "booking_id": booking_id,
        "amount": 200,
        "type": input.payment_method,
        "category": "fresh_service",
        "description": f"Fresh Service - Room {input.room_number}",
        "staff_id": user.get("_id"),
        "staff_name": user.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    await db.rooms.update_one(
        {"room_number": input.room_number},
        {"$set": {
            "status": "occupied",
            "current_booking_id": booking_id,
            "status_changed_at": datetime.now(timezone.utc).isoformat(),
            "status_changed_by": user.get("name")
        }}
    )
    booking_doc.pop("_id", None)
    return booking_doc

# ---------- BOOKING HISTORY (permanent ledger) ----------
@api_router.get("/bookings/history")
async def get_booking_history(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 50):
    await get_current_user(request)
    query = {}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    total = await db.bookings.count_documents(query)
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"bookings": bookings, "total": total, "page": page, "limit": limit}

# ---------- SEED DATA ----------
async def seed_rooms():
    # Nivant Lodge room layout
    nivant_rooms = [
        # Standard (₹600)
        {"room_number": 101, "floor": 1, "room_type": "standard", "rate": 600.0},
        {"room_number": 102, "floor": 1, "room_type": "standard", "rate": 600.0},
        {"room_number": 201, "floor": 2, "room_type": "standard", "rate": 600.0},
        {"room_number": 202, "floor": 2, "room_type": "standard", "rate": 600.0},
        {"room_number": 203, "floor": 2, "room_type": "standard", "rate": 600.0},
        {"room_number": 301, "floor": 3, "room_type": "standard", "rate": 600.0},
        {"room_number": 302, "floor": 3, "room_type": "standard", "rate": 600.0},
        {"room_number": 303, "floor": 3, "room_type": "standard", "rate": 600.0},
        # Non-AC Deluxe (₹1000), room 104 special (₹500)
        {"room_number": 103, "floor": 1, "room_type": "non_ac_deluxe", "rate": 1000.0},
        {"room_number": 104, "floor": 1, "room_type": "non_ac_deluxe", "rate": 500.0},
        {"room_number": 105, "floor": 1, "room_type": "non_ac_deluxe", "rate": 1000.0},
        {"room_number": 106, "floor": 1, "room_type": "non_ac_deluxe", "rate": 1000.0},
        {"room_number": 107, "floor": 1, "room_type": "non_ac_deluxe", "rate": 1000.0},
        # AC Deluxe (₹1200)
        {"room_number": 204, "floor": 2, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 205, "floor": 2, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 206, "floor": 2, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 304, "floor": 3, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 305, "floor": 3, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 306, "floor": 3, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 404, "floor": 4, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 405, "floor": 4, "room_type": "ac_deluxe", "rate": 1200.0},
        {"room_number": 406, "floor": 4, "room_type": "ac_deluxe", "rate": 1200.0},
    ]
    # Check if already migrated to Nivant layout
    has_404 = await db.rooms.find_one({"room_number": 404})
    if not has_404:
        await db.rooms.delete_many({})
        for r in nivant_rooms:
            r["status"] = "clean"
            r["current_booking_id"] = None
            r["status_changed_at"] = datetime.now(timezone.utc).isoformat()
            r["status_changed_by"] = "system"
        await db.rooms.insert_many(nivant_rooms)
        logging.info("Seeded 22 Nivant Lodge rooms")

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@hotel.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Hotel Owner",
            "role": "owner",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info(f"Created admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
    # Also create a staff user
    staff_email = "staff@hotel.com"
    staff_pass = "staff123"
    existing_staff = await db.users.find_one({"email": staff_email})
    if existing_staff is None:
        await db.users.insert_one({
            "email": staff_email,
            "password_hash": hash_password(staff_pass),
            "name": "Chotu",
            "role": "staff",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info(f"Created staff user: {staff_email}")

    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write(f"## Owner Account\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: owner\n\n")
        f.write(f"## Staff Account\n- Email: {staff_email}\n- Password: {staff_pass}\n- Role: staff\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n- POST /api/auth/logout\n")

async def seed_channels():
    count = await db.channels.count_documents({})
    if count == 0:
        channels = [
            {"channel_id": "CH-OYO", "name": "OYO", "channel_type": "ota", "commission_pct": 25, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"channel_id": "CH-MMT", "name": "MakeMyTrip", "channel_type": "ota", "commission_pct": 20, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"channel_id": "CH-BOOKING", "name": "Booking.com", "channel_type": "ota", "commission_pct": 15, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"channel_id": "CH-AGODA", "name": "Agoda", "channel_type": "ota", "commission_pct": 18, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"channel_id": "CH-GOIBIBO", "name": "Goibibo", "channel_type": "ota", "commission_pct": 20, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.channels.insert_many(channels)
        logging.info("Seeded 5 OTA channels")

async def seed_hotel_settings():
    # Always update to Nivant Lodge settings
    await db.settings.update_one({}, {"$set": {
        "hotel_name": "Nivant Lodge",
        "wifi_name": "NivantLodge",
        "wifi_password": "nivant1234",
        "hotel_rules": [
            "Check-in / Check-out time: 12:00 PM",
            "Overstay beyond 24 hours = full next day charge",
            "Do NOT arrive before 12:00 PM",
            "Early arrivals will be charged Rs.500 for temporary room until 12 PM",
            "No smoking in rooms",
            "Visitors not allowed after 10 PM",
            "ID proof required for all guests",
            "No loud music after 10 PM"
        ],
        "welcome_message": "Welcome to Nivant Lodge!",
        "checkout_message": "Thank you for staying at Nivant Lodge! Please leave a review.",
        "fresh_service_rate": 200,
        "fresh_service_duration": 30,
        "early_arrival_rate": 500
    }}, upsert=True)
    logging.info("Updated Nivant Lodge settings")

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    await seed_rooms()
    await seed_channels()
    await seed_hotel_settings()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
