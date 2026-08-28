# Siddartha Palace — Hotel Management System

A full-stack hotel and PG (paying-guest) management web application built with **HTML/CSS/JS + Express.js + MySQL + Twilio**.

---

## ✨ Features

### Public Website
- **Landing page** — Hero, amenities, testimonials, room preview
- **Rooms & Suites** — Search/filter by dates & type, book instantly
- **Gallery, About, FAQ, Contact, Policies** — Full marketing pages
- **Booking form** — Multi-step guest & stay details checkout

### Customer Dashboard
- Overview with loyalty tier, upcoming stays, pending payments
- My Bookings — view, cancel, download invoices
- Payments — pay now, download receipts
- Profile management & support contact form

### Admin Dashboard
- **Overview KPIs** — Monthly income, occupancy rate, active bookings, pending payments
- **Customers** — Search, add, edit, delete guest records
- **Rooms** — Manage room inventory and status
- **Bookings** — Approve, modify, cancel bookings
- **Payments** — Mark as paid, generate invoices
- **SMS Reminders** — Manual trigger + monthly schedule + delivery log

### Backend API (Express + MySQL)
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/rooms` | GET, POST, PUT, DELETE | Room CRUD |
| `/api/tenants` | GET, POST, PUT, DELETE | Tenant CRUD |
| `/api/payments` | GET, POST, PUT | Rent payment management |
| `/api/reminders/send-now` | POST | Manually trigger SMS/WhatsApp reminders |
| `/api/reminders/log` | GET | View reminder delivery history |
| `/api/reminders/status` | GET | Cron and Twilio config status |
| `/api/health` | GET | Server health check |

### Automated Rent Reminders (Twilio)
- Daily cron at 9:00 AM (days 1–5 of month)
- Sends personalised SMS + WhatsApp to tenants with pending/partial rent
- Dry-run mode when Twilio credentials are absent (logs to console)
- Duplicate prevention — won't re-send to same tenant on same day

---

## 🏗️ Project Structure

```
siddartha-palace/
├── assets/
│   ├── images/rooms/         # Room photography (6 types)
│   ├── styles.css            # Global design system
│   └── script.js             # Shared JS (tabs, modals, animations)
├── db/
│   ├── schema.sql            # MySQL table definitions
│   └── seed.sql              # Sample data for demo/testing
├── server/
│   ├── index.js              # Express app entry point
│   ├── db.js                 # MySQL connection pool
│   ├── .env                  # Local environment variables (git-ignored)
│   ├── .env.example          # Environment variable template
│   ├── routes/
│   │   ├── rooms.js          # /api/rooms
│   │   ├── tenants.js        # /api/tenants
│   │   ├── payments.js       # /api/payments
│   │   └── reminders.js      # /api/reminders
│   └── services/
│       ├── reminderService.js # Cron + reminder logic
│       └── twilioClient.js    # SMS/WhatsApp wrapper
├── index.html                # Landing page
├── rooms.html                # Room listing & search
├── booking.html              # Booking checkout
├── login.html                # Sign-in / register
├── admin-dashboard.html      # Admin console
├── customer-dashboard.html   # Guest portal
├── gallery.html
├── about.html
├── faq.html
├── contact.html
└── policies.html
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **MySQL** ≥ 8.0
- **Twilio account** (optional — app runs in dry-run mode without it)

### 1. Clone & install
```bash
git clone <repo-url>
cd siddartha-palace/server
npm install
```

### 2. Set up the database
```bash
# Create schema
mysql -u root -p < ../db/schema.sql

# (Optional) Load sample data
mysql -u root -p siddartha_palace < ../db/seed.sql
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and (optionally) Twilio keys
```

**.env example:**
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=siddartha_palace

# Leave blank to run without Twilio (dry-run mode)
TWILIO_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
```

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** in your browser.

---

## 🔔 SMS / WhatsApp Reminders

Reminders run automatically at **9:00 AM on days 1–5 of each month**.

| Env Variable | Default | Description |
|---|---|---|
| `REMINDER_CRON` | `0 9 * * *` | Cron expression |
| `REMINDER_START_DAY` | `1` | First day of month to send |
| `REMINDER_END_DAY` | `5` | Last day of month to send |

**Without Twilio credentials** — messages are logged to the console (dry-run).  
**With Twilio credentials** — live SMS + WhatsApp are sent.

You can also trigger reminders manually from the **Admin Dashboard → SMS Reminders → Send Now**, or via:
```bash
curl -X POST http://localhost:3000/api/reminders/send-now
```

---

## 🎨 Design System

- **Palette** — Deep ink (`#1B1030`), gold (`#C9A227`), ivory (`#FBF8F1`), maroon (`#8B1A2F`)
- **Typography** — Cormorant Garamond (headings), Inter (body) via Google Fonts
- **Components** — Buttons, badges, panels, modals, tabs, data tables, progress bars, form fields
- **Animations** — Page loader, scroll-reveal, counter, bar charts, micro-interactions

---

## 🧪 Demo Access

| Role | URL | Credentials |
|------|-----|------------|
| Guest | `/login.html` → "Continue as Customer (Demo)" | No credentials needed |
| Admin | `/login.html` → "Continue as Admin (Demo)" | No credentials needed |

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Vanilla CSS, Vanilla JS |
| Backend | Node.js, Express 4 |
| Database | MySQL 8 (mysql2 driver) |
| Messaging | Twilio (SMS + WhatsApp) |
| Scheduler | node-cron |
| Config | dotenv |

---

© 2026 Siddartha Palace. All rights reserved.
>>>>>>> 5d10a45 (feat: complete Siddartha Palace hotel management platform with interactive illumination, real-time booking, authentication, and dashboards)
