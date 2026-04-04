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
    aadhar_number: Optional[str] = None
    address: Optional[str] = None
    nationality: str = "Indian"
    num_guests: int = 1
    rate_per_day: float
    advance_paid: float = 0
    payment_method: str = "cash"
    check_in_time: Optional[str] = None
    id_type: str = "Aadhar"

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

    # Early check-in logic: if < 4 hours before standard time, full day
    # Late check-out: 5-hour grace period
    if remaining_hours > 5:
        total_days += 1
        billing_notes.append("Late checkout: exceeded 5-hour grace period, +1 day charged")
    elif remaining_hours > 0:
        billing_notes.append(f"Within 5-hour grace period ({remaining_hours:.1f} hrs)")

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

    # Mask Aadhar number (show only last 4)
    masked_aadhar = None
    if input.aadhar_number:
        digits = input.aadhar_number.replace(" ", "").replace("-", "")
        if len(digits) >= 4:
            masked_aadhar = "XXXX-XXXX-" + digits[-4:]
        else:
            masked_aadhar = digits

    booking_id = f"BK-{secrets.token_hex(4).upper()}"
    guest_id = f"G-{secrets.token_hex(4).upper()}"

    guest_doc = {
        "guest_id": guest_id,
        "name": input.guest_name,
        "phone": input.guest_phone,
        "aadhar_number": masked_aadhar,
        "aadhar_raw_last4": input.aadhar_number[-4:] if input.aadhar_number and len(input.aadhar_number) >= 4 else None,
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

    # Log WhatsApp welcome message (MOCKED)
    await db.whatsapp_logs.insert_one({
        "phone": input.guest_phone,
        "message_type": "welcome",
        "content": f"Welcome {input.guest_name}! Room {input.room_number} is ready.",
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

# ---------- SEED DATA ----------
async def seed_rooms():
    count = await db.rooms.count_documents({})
    if count == 0:
        rooms = []
        for i in range(1, 23):  # 22 rooms
            floor = 1 if i <= 8 else (2 if i <= 16 else 3)
            rooms.append({
                "room_number": 100 + i,
                "floor": floor,
                "room_type": "standard" if i <= 15 else "deluxe",
                "status": "clean",
                "rate": 1000.0 if i <= 15 else 1500.0,
                "current_booking_id": None,
                "status_changed_at": datetime.now(timezone.utc).isoformat(),
                "status_changed_by": "system"
            })
        await db.rooms.insert_many(rooms)
        logging.info("Seeded 22 rooms")

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

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    await seed_rooms()

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
