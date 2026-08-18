# MERN Authentication System

A production-ready, full-stack Authentication System built with the MERN stack (MongoDB, Express, React, Node.js). Features short-lived access tokens, long-lived refresh tokens with token rotation, hashed OTP verification for email verification & password reset, IP-based rate limiting, secure HTTP-only cookies, and Redux Toolkit state management.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Authentication Architecture](#authentication-architecture)
- [API Overview](#api-overview)
- [Security Features](#security-features)
- [Testing](#testing)
- [Development Commands](#development-commands)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- 🔐 **Dual-Token Authentication**: Short-lived Access Tokens (15m) + Long-lived Refresh Tokens (7d).
- 🔄 **Refresh Token Rotation & Revocation**: Automatically invalidates and rotates refresh tokens on renewal or logout.
- 🛡️ **Hashed OTP Verification**: Secure SHA-256 hashed storage for Email Verification and Password Reset OTPs with timing-safe comparison.
- ⏳ **Rate Limiting**: Protects login, registration, and OTP generation endpoints against brute-force attacks and abuse.
- 🍪 **Secure HTTP-Only Cookies**: Tokens are passed via `httpOnly`, `sameSite`, and `secure` flags preventing XSS token theft.
- 🛡️ **Security Headers**: Integrated `helmet` middleware for security-hardened HTTP headers.
- ⚛️ **State Management**: React state managed with Redux Toolkit and Async Thunks.
- 🎨 **Modern UI**: Clean UI built with React 19, Tailwind CSS, and Lucide React icons.
- 🧪 **Automated Testing**: Integration test suite using Vitest, Supertest, and `mongodb-memory-server`.

---

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ORM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `crypto`
- **Security & Utilities**: `helmet`, `express-rate-limit`, `cookie-parser`, `cors`, `dotenv`
- **Email**: `nodemailer`
- **Testing**: `vitest`, `supertest`, `mongodb-memory-server`

### Frontend
- **Framework**: React 19 (Vite)
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`), `react-redux`
- **Routing**: `react-router-dom`
- **HTTP Client**: `axios`
- **Styling**: Tailwind CSS
- **Notifications**: `react-toastify`

---

## Project Structure

```text
.
├── backend/
│   ├── Config/
│   │   ├── Db.name.js
│   │   ├── emailTemplates.js
│   │   ├── mongodb.js
│   │   ├── nodemailer.js
│   │   └── validateEnv.js
│   ├── controller/
│   │   ├── auth.Controllers.js
│   │   └── user.controllers.js
│   ├── middleware/
│   │   ├── auth.midel.js
│   │   └── rateLimiter.js
│   ├── model/
│   │   └── user.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── tests/
│   │   └── auth.test.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Requirements

Before running the project, ensure you have:

- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **MongoDB**: A running local MongoDB instance or a MongoDB Atlas connection string
- **SMTP Server**: Credentials for sending verification emails (e.g., Brevo, SendGrid, Gmail SMTP)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/MERN-AUTH.git
cd MERN-AUTH
```

### 2. Configure Environment Variables

Create `.env` files in both `backend/` and `frontend/` folders using the provided `.env.example` templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in the appropriate configuration values (see [Environment Variables](#environment-variables)).

### 3. Install Backend Dependencies & Start Server

```bash
cd backend
npm install
npm run dev
```

### 4. Install Frontend Dependencies & Start App

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server listening port | `3000` |
| `NODE_ENV` | Application environment | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/mern-auth` |
| `JWT_SECRET` | Secret key for signing Access Tokens | `your_super_secret_access_key` |
| `REFRESH_TOKEN_SECRET` | Secret key for signing Refresh Tokens | `your_super_secret_refresh_key` |
| `SENDER_EMAIL` | Sender email address for outgoing emails | `noreply@yourdomain.com` |
| `SMTP_HOST` | SMTP server hostname | `smtp.example.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `smtp_user` |
| `SMTP_PASS` | SMTP password | `smtp_password` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_BECKEND_URL` | Base URL of the backend API | `http://localhost:3000` |

---

## Authentication Architecture

```text
User Request
     │
     ▼
[ POST /api/auth/login ]
     │
     ▼
Validate Credentials (bcrypt.compare)
     │
     ├─────────────► Issue Access Token (15m, HTTP-only Cookie)
     └─────────────► Issue Refresh Token (7d, HTTP-only Cookie + Stored in DB)
     │
     ▼
Authenticated API Requests (via userAuth Middleware)
     │
     ├─► Access Token Valid ──► Proceed to Controller
     └─► Access Token Expired ─► [ POST /api/auth/refresh-token ]
                                      │
                                      ▼
                               Rotate Tokens (Issue New Access + Refresh Token)
```

---

## API Overview

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Protection | Description | Rate Limit |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user account | 10 req / 15m |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue tokens | 10 req / 15m |
| `POST` | `/api/auth/logout` | Public | Revoke tokens & clear cookies | None |
| `POST` | `/api/auth/refresh-token` | Public | Issue new token pair via refresh token | None |
| `GET` | `/api/auth/is-Auth` | Authenticated | Verify active session status | None |
| `POST` | `/api/auth/send-verify-otp` | Authenticated | Send email verification OTP | 5 req / 15m |
| `POST` | `/api/auth/verfiy-account` | Authenticated | Verify account with OTP | None |
| `POST` | `/api/auth/send-reset-otp` | Public | Send password reset OTP | 5 req / 15m |
| `POST` | `/api/auth/reset-password` | Public | Reset password using OTP | None |

### User Routes (`/api/user`)

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/user/data` | Authenticated | Get profile details of authenticated user |

---

## Security Features

1. **Password Hashing**: Passwords are hashed using `bcryptjs` (salt rounds: 10).
2. **Hashed OTP Storage**: OTPs are hashed using SHA-256 before storage to prevent exposure in database compromises.
3. **Timing-Safe Comparison**: OTP comparison uses `crypto.timingSafeEqual` to protect against timing attacks.
4. **Token Security**: Tokens are delivered in `httpOnly` cookies to prevent client-side JavaScript access and XSS vulnerability risks.
5. **Rate Limiting**: Brute-force attacks on auth endpoints and OTP spamming are mitigated using `express-rate-limit`.
6. **Environment Validation**: Server startup performs schema checks on critical environment variables to prevent silent misconfigurations.
7. **CORS Control**: Configured origin checks with strict credential support (`credentials: true`).

---

## Testing

Backend automated integration tests can be executed using Vitest:

```bash
cd backend
npm test
```

This runs integration tests using `mongodb-memory-server` without modifying your live database.

---

## Development Commands

### Backend Commands
- `npm run dev`: Start backend server with `nodemon`
- `npm start`: Start production backend server
- `npm test`: Run test suite with `vitest`

### Frontend Commands
- `npm run dev`: Start Vite development server
- `npm run build`: Build production assets
- `npm run lint`: Run ESLint checks

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

No license has been specified yet for this repository. Please consult the repository owner before using this code for commercial purposes.
