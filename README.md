# Education Management System — Backend Developer Assessment

This repository contains the backend implementation for the **Backend Developer Skill Assessment**:

**Problem 2 — Complete CRUD Operations in Student Management**

---

## Assessment Scope

The objective of this assessment was to implement complete, production-quality Student Management CRUD operations within the existing repository structure:

* **Runtime & Framework**: Node.js, Express.js
* **Database**: PostgreSQL
* **Architecture**: Express Router → Middleware → Controller → Service → Repository → PostgreSQL
* **Role Policy**: Student entities strictly isolated to `role_id = 3`

The scope is strictly focused on backend student management. Unrelated assessment challenges (Frontend Notice, Blockchain, Go Service, Dockerization) have been excluded to keep this submission focused, clean, and reviewer-friendly.

---

## Implemented Endpoints

The following REST endpoints are implemented and fully functional:

| Method | Endpoint | Description | Auth / Security |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/students` | List students with optional query filtering | JWT + CSRF |
| `GET` | `/api/v1/students/:id` | Fetch detailed student profile by ID | JWT + CSRF + Param Validation |
| `POST` | `/api/v1/students` | Create new student profile and account | JWT + CSRF + Body Validation |
| `PUT` | `/api/v1/students/:id` | Update existing student profile by ID | JWT + CSRF + Schema Validation |
| `DELETE` | `/api/v1/students/:id` | Atomically remove student and profile | JWT + CSRF + Param Validation |
| `POST` | `/api/v1/students/:id/status` | Toggle active status / system access | JWT + CSRF + Param Validation |

---

## Architecture

The module adheres strictly to the existing layered architectural pattern:

```text
Client (Web / HTTP)
  ↓
Express Router (`sudents-router.js`)
  ↓
Authentication & CSRF Middleware (`authenticateToken`, `csrfProtection`)
  ↓
Request Validation Middleware (`validateRequest(ZodSchema)`)
  ↓
Controller (`students-controller.js`)
  ↓
Service Layer (`students-service.js`)
  ↓
Repository Layer (`students-repository.js`)
  ↓
PostgreSQL Database (`users`, `user_profiles`, `student_add_update`)
```

* **Router**: Maps HTTP verbs to endpoints and binds security and validation middlewares.
* **Controller**: Extracts HTTP request parameters/body, delegates to the service layer, and shapes JSON responses.
* **Service**: Enforces domain business logic, role verification (`role_id = 3`), existence validation, and error propagation.
* **Repository**: Executes parameterized SQL queries and manages multi-statement transactions.
* **PostgreSQL**: Stores relational data across `users` and `user_profiles` tables and executes stored procedures.

---

## What Was Implemented

### 1. Student List Retrieval (`GET /api/v1/students`)
* Fetches students filtered by `role_id = 3`.
* Supports query filters: `name`, `className` / `class`, `section`, and `roll`.
* Returns mapped camelCase attributes matching frontend expectations (`id`, `name`, `email`, `role`, `lastLogin`, `systemAccess`).
* Returns `404 Not Found` when no students match the criteria.

### 2. Student Detail Retrieval (`GET /api/v1/students/:id`)
* Validates that the requested ID exists and corresponds to a student (`role_id = 3`).
* Returns joined user and profile fields (`phone`, `gender`, `dob`, `class`, `section`, `roll`, parent/guardian contact info, addresses, `admissionDate`, and `reporterName`).
* Returns `404 Not Found` for non-existent users or non-student accounts (e.g. Admin or Teacher IDs).

### 3. Student Creation (`POST /api/v1/students`)
* Validates request payload against `StudentCreateSchema` using Zod.
* Executes PostgreSQL stored procedure `student_add_update($1)`.
* Returns `400 Bad Request` with an informative error message if the email already exists.
* Safely dispatches account verification email with timeout resilience.

### 4. Student Update (`PUT /api/v1/students/:id`)
* Enforces URL parameter `:id` as authoritative over the payload.
* Verifies student existence (`role_id = 3`) before invoking database procedures to prevent inadvertent record creation when updating non-existent IDs.
* Updates personal, academic, address, and guardian information.

### 5. Atomic Student Deletion (`DELETE /api/v1/students/:id`)
* Verifies student existence and role.
* Deletes records inside a single atomic database transaction (`BEGIN` / `COMMIT` / `ROLLBACK`).
* Child record in `user_profiles` is deleted before the parent record in `users` (`user_profiles.user_id` lacks foreign key cascade delete in the schema).
* Rejection and rollback guarantee no orphaned records upon failure.

---

## Database

The student entity spans two core relational tables:

```text
       users (Parent)
┌─────────────────────────┐
│ id (PK)                 │
│ name, email             │
│ role_id (3 = Student)   │
│ is_active, reporter_id  │
└────────────┬────────────┘
             │ 1:1 (user_id FK)
             ▼
    user_profiles (Child)
┌─────────────────────────┐
│ id (PK)                 │
│ user_id (FK -> users.id)│
│ class_name, section_name│
│ roll, phone, dob, gender│
│ father_*, mother_*, ... │
└─────────────────────────┘
```

* **Transaction Safety**: Because `user_profiles` does not specify `ON DELETE CASCADE`, deletion must occur within a transaction (`DELETE FROM user_profiles WHERE user_id = $1` followed by `DELETE FROM users WHERE id = $1 AND role_id = 3`).

---

## Security

* **Authentication**: Requests require valid `accessToken` and `refreshToken` HTTP-only cookies verified by `authenticateToken`.
* **CSRF Protection**: All state-mutating requests (`POST`, `PUT`, `DELETE`) require a matching `x-csrf-token` header verified by `csrfProtection`.
* **SQL Injection Prevention**: All queries in `students-repository.js` use parameterized inputs (`$1`, `$2`, etc.).
* **Role Isolation**: Only accounts with `role_id = 3` are accessible, modifiable, or deletable via student endpoints. Non-student accounts return `404 Not Found`.
* **Safe Error Handling**: Internal server errors and database details are caught and normalized into standard API responses without leaking connection strings or stack traces.

---

## Validation & Error Handling

Zod schemas in `student-schema.js` validate requests before reaching the controller:

* **Malformed IDs**: Non-numeric IDs (e.g., `/students/abc`) return `400 Bad Request` (`"ID must be a valid number"`).
* **Missing Fields**: Incomplete `POST` bodies return `400 Bad Request` (`"Validation error"`).
* **Duplicate Email**: Registering an existing email returns `400 Bad Request` (`"Email already exists"`).
* **Non-existent Records**: Accessing or updating missing records returns `404 Not Found` (`"Student not found"`).
* **Unauthenticated Requests**: Missing or invalid tokens return `401 Unauthorized`.

---

## Testing

The implementation was verified using a 50-assertion automated test suite covering positive and negative paths:

| Test Scenario | Condition Verified | Result |
| :--- | :--- | :--- |
| **Authentication Flow** | Admin login, cookie reception (`accessToken`, `refreshToken`, `csrfToken`) | **PASS** |
| **GET All (Empty)** | Returns `404 Students not found` when database is empty | **PASS** |
| **POST Incomplete Body** | Returns `400 Bad Request` with validation error messages | **PASS** |
| **POST Valid Student** | Creates student, inserts into `users` & `user_profiles`, returns 200 | **PASS** |
| **POST Duplicate Email** | Rejects registration with `400 Email already exists` | **PASS** |
| **GET All Students** | Returns list of students with correct roles and camelCase keys | **PASS** |
| **GET Class Filter** | Query filtering by `?class=Class 10` returns only matching students | **PASS** |
| **GET Student Detail** | Returns complete student profile with parent and address fields | **PASS** |
| **GET Nonexistent ID** | Accessing `/students/999999` returns `404 Student not found` | **PASS** |
| **GET Malformed ID** | Accessing `/students/abc` returns `400 Bad Request` | **PASS** |
| **PUT Valid Update** | Modifies student name, section, roll, and address | **PASS** |
| **PUT Nonexistent ID** | Returns `404 Student not found` and **does NOT create a new record** | **PASS** |
| **POST Status Update** | Toggles `is_active` (`systemAccess`) flag via status endpoint | **PASS** |
| **DELETE Student** | Atomically removes user from `user_profiles` and `users` | **PASS** |
| **DELETE Verification** | Post-deletion query returns `404 Student not found`; no orphans in DB | **PASS** |
| **DELETE Nonexistent ID**| Deleting missing ID returns `404 Student not found` | **PASS** |
| **Role Isolation** | Admin user (ID 1) accessed or deleted via student routes returns 404 | **PASS** |
| **Security Gate** | Requests without auth cookies return `401 Unauthorized` | **PASS** |

---

## Setup & Running

### 1. Database Setup
Create and seed the PostgreSQL database:
```bash
# Create database
createdb school_mgmt

# Run schema migrations and seeds
psql -d school_mgmt -f seed_db/tables.sql
psql -d school_mgmt -f seed_db/seed-db.sql
```

### 2. Backend Environment
Copy the example environment configuration:
```bash
cd backend
cp .env.example .env
```
Ensure `DATABASE_URL` in `.env` matches your local PostgreSQL credentials:
```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_mgmt
```

### 3. Install & Start Server
```bash
cd backend
npm install
npm run dev:server
```
The server will start on `http://localhost:5007`.

---

## API Testing (curl)

### 1. Login & Obtain Tokens
```bash
curl -i -X POST http://localhost:5007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@school-admin.com", "password": "3OU4zn3q6Zh9"}'
```
Extract `accessToken`, `refreshToken`, and `csrfToken` from response cookies.

### 2. List Students
```bash
curl -X GET http://localhost:5007/api/v1/students \
  -H "Cookie: accessToken=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>; csrfToken=<CSRF_TOKEN>" \
  -H "x-csrf-token: <CSRF_TOKEN>"
```

### 3. Create Student
```bash
curl -X POST http://localhost:5007/api/v1/students \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>; csrfToken=<CSRF_TOKEN>" \
  -H "x-csrf-token: <CSRF_TOKEN>" \
  -d '{
    "name": "Jane Doe",
    "email": "jane.doe@school.com",
    "gender": "Female",
    "dob": "2008-04-12",
    "phone": "9876543210",
    "class": "Class 10",
    "section": "A",
    "roll": 101,
    "admissionDate": "2024-01-15",
    "currentAddress": "123 Academic Way",
    "permanentAddress": "123 Academic Way",
    "fatherName": "John Doe",
    "guardianName": "John Doe",
    "guardianPhone": "9876543211",
    "relationOfGuardian": "Father",
    "systemAccess": true
  }'
```

### 4. Get Student Details
```bash
curl -X GET http://localhost:5007/api/v1/students/<STUDENT_ID> \
  -H "Cookie: accessToken=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>; csrfToken=<CSRF_TOKEN>" \
  -H "x-csrf-token: <CSRF_TOKEN>"
```

### 5. Update Student
```bash
curl -X PUT http://localhost:5007/api/v1/students/<STUDENT_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>; csrfToken=<CSRF_TOKEN>" \
  -H "x-csrf-token: <CSRF_TOKEN>" \
  -d '{
    "name": "Jane Doe Updated",
    "section": "B",
    "roll": 102
  }'
```

### 6. Delete Student
```bash
curl -X DELETE http://localhost:5007/api/v1/students/<STUDENT_ID> \
  -H "Cookie: accessToken=<ACCESS_TOKEN>; refreshToken=<REFRESH_TOKEN>; csrfToken=<CSRF_TOKEN>" \
  -H "x-csrf-token: <CSRF_TOKEN>"
```

---

## Project Structure

```text
Education-Management-System/
├── .gitignore                                 # Git ignore rules for secrets and dependencies
├── README.md                                  # Assessment documentation (this file)
├── seed_db/                                   # Database schema migrations and seeds
│   ├── tables.sql                             # DDL for users, profiles, roles, permissions
│   └── seed-db.sql                            # Initial roles, permissions, and admin user
└── backend/                                   # Backend application root
    ├── package.json                           # Dependencies and scripts
    ├── .env.example                           # Configuration template
    └── src/
        ├── app.js                             # Express application configuration
        ├── server.js                          # HTTP server entrypoint
        ├── config/                            # Database pool and environment config
        ├── middlewares/                       # JWT auth, CSRF, error handlers
        ├── utils/                             # DB request wrapper, validation helpers
        └── modules/
            └── students/                      # Student Management Module
                ├── sudents-router.js          # Route declarations & middleware bindings
                ├── student-schema.js          # Zod validation schemas
                ├── students-controller.js     # Request/response handlers
                ├── students-service.js        # Business logic & role validation
                └── students-repository.js     # Parameterized SQL & transaction management
```

---

## Assessment Notes

1. **Routing Filename**: The file `sudents-router.js` preserves the original filename as required by `backend/src/routes/v1.js:5` to avoid breaking existing imports.
2. **Transaction Integrity**: Student deletion is implemented using an atomic database transaction to prevent orphan records, respecting the schema constraint where `user_profiles` lacks cascade deletion.
3. **Stored Procedure Idempotency**: Stored procedure `student_add_update` performs an insert if the provided user ID is not found. To prevent `PUT /students/:id` on an invalid ID from inadvertently creating a new user, `students-service.js` performs explicit student existence verification before delegating to the database.
