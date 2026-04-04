// Marathi-English Translation Dictionary
const translations = {
  // Navigation
  "dashboard": { mr: "डॅशबोर्ड", en: "Dashboard" },
  "galla": { mr: "गल्ला", en: "Cashbox" },
  "profile": { mr: "प्रोफाइल", en: "Profile" },
  "rooms": { mr: "रूम्स", en: "Rooms" },
  "expenses": { mr: "खर्च", en: "Expenses" },
  "analytics": { mr: "विश्लेषण", en: "Analytics" },
  "form_c": { mr: "फॉर्म C", en: "Form C" },
  "whatsapp": { mr: "व्हॉट्सॲप", en: "WhatsApp" },
  "settings": { mr: "सेटिंग्ज", en: "Settings" },
  "logout": { mr: "बाहेर पडा", en: "Logout" },
  "login": { mr: "लॉगिन", en: "Login" },

  // Room Status
  "clean": { mr: "स्वच्छ", en: "Clean" },
  "occupied": { mr: "भरलेली", en: "Occupied" },
  "cleaning": { mr: "सफाई", en: "Cleaning" },
  "available": { mr: "उपलब्ध", en: "Available" },

  // Actions
  "check_in": { mr: "चेक-इन", en: "Check-In" },
  "check_out": { mr: "चेक-आउट", en: "Check-Out" },
  "mark_clean": { mr: "स्वच्छ करा", en: "Mark Clean" },
  "mark_cleaning": { mr: "सफाई सुरू", en: "Start Cleaning" },
  "view_bill": { mr: "बिल पहा", en: "View Bill" },
  "add_advance": { mr: "ॲडव्हान्स जोडा", en: "Add Advance" },
  "submit": { mr: "जमा करा", en: "Submit" },
  "cancel": { mr: "रद्द करा", en: "Cancel" },
  "save": { mr: "सेव्ह करा", en: "Save" },
  "export": { mr: "एक्सपोर्ट", en: "Export" },
  "send": { mr: "पाठवा", en: "Send" },

  // Guest Details
  "guest_name": { mr: "पाहुण्याचे नाव", en: "Guest Name" },
  "phone": { mr: "फोन नंबर", en: "Phone Number" },
  "aadhar": { mr: "आधार कार्ड", en: "Aadhar Card" },
  "address": { mr: "पत्ता", en: "Address" },
  "num_guests": { mr: "पाहुण्यांची संख्या", en: "Number of Guests" },
  "nationality": { mr: "राष्ट्रीयत्व", en: "Nationality" },
  "id_type": { mr: "ओळखपत्र प्रकार", en: "ID Type" },

  // Billing
  "rate_per_day": { mr: "दर प्रतिदिन", en: "Rate Per Day" },
  "total_amount": { mr: "एकूण रक्कम", en: "Total Amount" },
  "advance_paid": { mr: "ॲडव्हान्स", en: "Advance Paid" },
  "balance_due": { mr: "बाकी रक्कम", en: "Balance Due" },
  "payment_method": { mr: "पेमेंट पद्धत", en: "Payment Method" },
  "cash": { mr: "रोख", en: "Cash" },
  "upi": { mr: "UPI", en: "UPI" },
  "discount": { mr: "सवलत", en: "Discount" },
  "additional_charges": { mr: "अतिरिक्त शुल्क", en: "Additional Charges" },

  // Galla
  "cash_collected": { mr: "रोख जमा", en: "Cash Collected" },
  "upi_collected": { mr: "UPI जमा", en: "UPI Collected" },
  "total_collected": { mr: "एकूण जमा", en: "Total Collected" },
  "total_expenses": { mr: "एकूण खर्च", en: "Total Expenses" },
  "net_amount": { mr: "निव्वळ रक्कम", en: "Net Amount" },
  "shift_summary": { mr: "शिफ्ट सारांश", en: "Shift Summary" },
  "todays_collection": { mr: "आजची वसुली", en: "Today's Collection" },

  // Analytics
  "occupancy_rate": { mr: "भरलेल्या रूमची टक्केवारी", en: "Occupancy Rate" },
  "today_revenue": { mr: "आजचा महसूल", en: "Today's Revenue" },
  "month_revenue": { mr: "महिन्याचा महसूल", en: "Monthly Revenue" },
  "revenue_leakage": { mr: "महसूल गळती", en: "Revenue Leakage" },
  "staff_performance": { mr: "कर्मचारी कामगिरी", en: "Staff Performance" },

  // Status Messages
  "offline_warning": { mr: "इंटरनेट बंद! ऑनलाइन बुकिंग तपासा.", en: "Internet Off! Check online bookings manually." },
  "welcome": { mr: "स्वागत आहे", en: "Welcome" },
  "room_number": { mr: "रूम नं.", en: "Room No." },
  "floor": { mr: "मजला", en: "Floor" },
  "standard": { mr: "स्टँडर्ड", en: "Standard" },
  "deluxe": { mr: "डिलक्स", en: "Deluxe" },

  // Form C
  "government_export": { mr: "सरकारी एक्सपोर्ट", en: "Government Export" },
  "guest_register": { mr: "पाहुणे रजिस्टर", en: "Guest Register" },
  "download_csv": { mr: "CSV डाउनलोड", en: "Download CSV" },

  // Expense Categories
  "laundry": { mr: "धुलाई", en: "Laundry" },
  "electricity": { mr: "वीज", en: "Electricity" },
  "water": { mr: "पाणी", en: "Water" },
  "maintenance": { mr: "देखभाल", en: "Maintenance" },
  "supplies": { mr: "पुरवठा", en: "Supplies" },
  "other": { mr: "इतर", en: "Other" },

  // Misc
  "no_data": { mr: "डेटा नाही", en: "No Data" },
  "loading": { mr: "लोड होत आहे...", en: "Loading..." },
  "error": { mr: "त्रुटी", en: "Error" },
  "success": { mr: "यशस्वी", en: "Success" },
  "confirm": { mr: "खात्री करा", en: "Confirm" },
  "digital_register": { mr: "डिजिटल रजिस्टर", en: "Digital Register" },
  "hotel_management": { mr: "हॉटेल व्यवस्थापन", en: "Hotel Management" },
  "scan_aadhar": { mr: "आधार स्कॅन करा", en: "Scan Aadhar" },
  "capture_photo": { mr: "फोटो काढा", en: "Capture Photo" },
  "take_photo": { mr: "फोटो घ्या", en: "Take Photo" },
  "early_checkin_note": { mr: "४ तासांपूर्वी = पूर्ण दिवस", en: "<4 hrs = Full Day charge" },
  "late_checkout_note": { mr: "५ तास ग्रेस पिरियड", en: "5-hour grace period" },
  "owner_dashboard": { mr: "मालकाचा डॅशबोर्ड", en: "Owner Dashboard" },
  "email": { mr: "ईमेल", en: "Email" },
  "password": { mr: "पासवर्ड", en: "Password" },
  "staff": { mr: "कर्मचारी", en: "Staff" },
  "owner": { mr: "मालक", en: "Owner" },
  "long_press_to_clean": { mr: "स्वच्छ करण्यासाठी दाबून ठेवा", en: "Long press to mark clean" },
};

export default translations;
