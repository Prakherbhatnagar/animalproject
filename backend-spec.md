# Backend Specification (backend-spec.md)

## 1. Authentication Endpoints

### 1.1 OTP Login (`POST /api/auth/otp`)
**Request Body:**
```json
{
  "phone": "+91 9876543210"
}
```
**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "name": "User Name",
    "phone": "+91 9876543210",
    "role": "reporter" // or "admin"
  }
}
```

### 1.2 Google Login (`POST /api/auth/google`)
**Request Body:**
```json
{
  "idToken": "google_jwt_token_here"
}
```
**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "name": "Rahul Mehta",
    "email": "rahul@example.com",
    "role": "reporter" // or "admin"
  }
}
```

## 2. Animal Reports Endpoints

### 2.1 Create Report (`POST /api/reports`)
**Request Body (FormData or JSON + Base64):**
```json
{
  "animalType": "Dog", // e.g., Dog, Cat, Cow
  "animalCondition": "Injured", // e.g., Injured, Lost
  "description": "Found near the main gate.",
  "priority": "medium", // low, medium, high, critical
  "imageDataUrl": "data:image/jpeg;base64,...", // Optional if using multer for form-data
  "imageHash": "a1b2c3d4e5f6...", // Client-side hash (optional/reference)
  "location": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "Near Lodhi Garden Gate 2, New Delhi"
  }
}
```
*Note: Server will compute `imageHash` via `multer` for zero-duplicate checks. If duplicate, returns `409 Conflict`.*

### 2.2 Get Reports (`GET /api/reports`)
**Query Parameters (Optional):**
- `lat` (float): Latitude for proximity search
- `lng` (float): Longitude for proximity search
- `radius` (number): Radius in meters or km (using 2dsphere)

**Response:**
```json
[
  {
    "id": "RPT-123",
    "animalType": "Dog",
    "animalCondition": "Injured",
    "description": "Found near main gate",
    "priority": "medium",
    "imageDataUrl": "http://res.cloudinary.com/...",
    "imageHash": "server_computed_hash",
    "location": {
      "type": "Point",
      "coordinates": [77.2090, 28.6139],
      "address": "Near Lodhi Garden Gate 2, New Delhi"
    },
    "status": "pending",
    "reporterName": "Priya Sharma",
    "reporterPhone": "+91 9988776655",
    "createdAt": "2026-03-26T12:00:00.000Z"
  }
]
```

### 2.3 Update Report Status (`PATCH /api/reports/:id/status`)
**Request Body:**
```json
{
  "status": "in_progress" // "pending", "in_progress", "completed"
}
```

## WebSocket Events (`socket.io`)
- **Emit:** `new_report` (Server -> Client) when a report is created.
- **Payload:** Dispatches the complete new Report object to update NGO Maps live.
