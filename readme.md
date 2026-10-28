# 🌐 EchoStay – Audio-Based Hotel Booking Website

## 📝 Problem Description
Traditional online hotel booking platforms require users to manually enter multiple details such as destination, dates, guest count, and personal information. This process can be time-consuming, confusing for non-technical users, and inconvenient when multitasking or traveling. There is a clear need for a hands-free, intuitive, and conversational booking experience that reduces user effort and eliminates the complexity of navigating through multiple screens or forms.

---

## 💡 Solution
EchoStay turns hotel booking into a simple voice conversation, while keeping a normal click-and-type UI for everything.

- Users search, filter and book hotels with **voice commands** (or the regular forms).
- Speech is transcribed in the browser and classified into an action (search, set dates, book, pay, …) by **Google Gemini**.
- Free-text requests like *"cheap family hotel in Goa under 3000"* are turned into search filters by Gemini.
- Hotels come from the app's own database, managed by admins.
- Bookings are priced per night and paid by card through **Stripe**.
- After payment the user gets a confirmation email and can download a PDF invoice.

---

## 🛠️ Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React (Create React App), React Router, Bootstrap, react-speech-recognition, chrono-node, Stripe Elements |
| Backend | Node.js, Express, Sequelize, helmet, express-rate-limit, multer, PDFKit, Nodemailer |
| Database | MySQL |
| External services | Stripe (payments), Google Gemini (voice intents & AI search), Gmail SMTP (emails), Pexels (seed images) |

---

## 🚀 Running locally

Prerequisites: Node.js 18+ and a MySQL database.

### Server (`server/`)
```bash
cd server
npm install
npm run dev          # nodemon, restarts on changes (use `npm start` in production)
npm run seed:hotels  # optional: fill the Hotels table with sample data
```

Create `server/.env` with these variables (values not shown — never commit this file):

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DIALECT` | MySQL connection |
| `JWT_SECRET` | Signs login tokens |
| `STRIPE_SECRET_TEST` | Stripe secret key |
| `GMAIL`, `GMAIL_SECRET_KEY` | Gmail account + app password for emails |
| `GEMINI_API_KEY` | Voice commands and AI search |
| `PEXELS_API_KEY` | Only for `seed:hotels` |
| `CLIENT_ORIGIN` | Optional. Allowed browser origins, comma-separated (default `http://localhost:3000`) |
| `SERVER_PUBLIC_URL` | Optional. Public base URL used for uploaded image links |
| `TRUST_PROXY` | Optional. Set when running behind a reverse proxy |
| `PORT` | Optional. Defaults to `3001` |
| `NODE_ENV` | Set to `production` to disable automatic table altering on start |

### Client (`client/`)
```bash
cd client
npm install
npm start
```

Create `client/.env` with:

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | Server URL, e.g. `http://localhost:3001` |
| `REACT_APP_STRIPE_PUBLIC_KEY` | Stripe publishable key |

---

## 🗺️ Pages

| Route | Page |
|---|---|
| `/` | Home with search and voice assistant |
| `/hotels` | Hotel list with filters and AI search |
| `/hotels/:id` | Hotel details and booking form |
| `/login`, `/register` | Account |
| `/payment/:bookingId` | Card payment (logged in) |
| `/my-bookings` | Bookings and invoices (logged in) |
| `/admin`, `/admin/hotels` | Dashboard and hotel management (admins) |
