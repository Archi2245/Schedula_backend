# 📋 Schedula Backend With Nestjs

A backend system for doctor-patient appointment management built using **NestJS**, **PostgreSQL**, and **TypeORM**.

---

## 🚀 Tech Stack

* **Framework**: NestJS (TypeScript)
* **Database**: PostgreSQL
* **ORM**: TypeORM
* **Authentication**: JWT (Access & Refresh Tokens), Google OAuth2

---

## 🛠️ Setup Instructions

```bash
# 1. Clone the repo
git clone https://github.com/PearlThoughtsInternship/Schedula_Backend_Code_Crusaders.git

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Fill in DB credentials, JWT secrets, Google OAuth credentials

# 4. Run DB migrations
npm run migration:run

# 5. Start the dev server
npm run start:dev
```

---

## 📦 Features Implemented

### ✅ Authentication (Doctor & Patient)

* Signup with email/password and role selection
* Signin with JWT Access + Refresh Tokens
* Signout (clears refresh token)
* Refresh Token logic
* Google OAuth2 (role-based)
* Prevent mixed login methods (Google vs Local)

### ✅ Role-Based Access

* Guards for JWT and roles
* Profile routes:

  * `/api/v1/doctor/profile`
  * `/api/v1/patient/profile`

### ✅ Doctor Availability & Slots

* **POST** `/doctors/:id/availability`

  * Input: date, start/end time, session, etc.
  * Saves availability and generates 30-min slots
* **GET** `/doctors/:id/availability`

  * Lists available slots (grouped by date)

---

## 📢 API Endpoints

### Auth

| Method | Endpoint                        | Description               |
| ------ | ------------------------------- | ------------------------- |
| POST   | /api/v1/auth/signup             | Register (Doctor/Patient) |
| POST   | /api/v1/auth/signin             | Login                     |
| POST   | /api/v1/auth/signout            | Logout                    |
| POST   | /api/v1/auth/refresh            | Refresh JWT tokens        |
| GET    | /api/v1/auth/google?role=doctor | Start Google login        |
| GET    | /api/v1/auth/google/callback    | Handle Google callback    |

### Doctor

| Method | Endpoint                   | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| POST   | /doctors/:id/availability | Create availability & slots          |
| GET    | /doctors/:id/availability | Fetch available slots (for patients) |
| GET    | /api/v1/doctor/profile     | View doctor profile                  |

---