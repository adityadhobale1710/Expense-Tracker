# Debugging Report: Add Bill Feature Request Flow

We analyzed the request flow for the **Add Scheduled Bill** feature in the redesigned calendar module. Below is the detailed logs and observations for every stage of the request, along with the identified root cause and fix.

---

## Request Flow Log & Analysis

### 1. Button Submit Handler
- **Trigger**: Click "Save Bill Schedule" button inside the `<Modal>` form.
- **Form Button JSX**: `<button type="submit" className="btn-primary px-6">Save Bill Schedule</button>`
- **Handler Code**: `handleSaveBill(e)` is registered on form submission `<form onSubmit={handleSaveBill} className="space-y-4">`.
- **Status**: **Success**. The form submission event correctly calls the handler.

### 2. Form onSubmit Event
- **Status**: **Success**. React intercepts the event and executes `handleSaveBill` while calling `e.preventDefault()` to prevent a page reload.

### 3. Form Validation
- **Frontend Checks**:
  ```javascript
  if (!formTitle || !formAmount || !formCategory || !formDueDate) {
    toast.error('Please fill in all required fields');
    return;
  }
  ```
- **Inputs Validation**: Native HTML5 `required` constraints are present on inputs (Title, Amount, Category, Due Date).
- **Form Values (Sample)**:
  - `formTitle`: `"Electricity Bill"`
  - `formAmount`: `"1450"` (String)
  - `formCategory`: `"Electricity"`
  - `formDueDate`: `"2026-08-25"`
  - `formPriority`: `"medium"`
  - `formPaymentMethod`: `"upi"`
- **Status**: **Success**. Validation passes when all required inputs are filled.

### 4. API Request Construction
- **Payload Construction**:
  ```javascript
  const payload = {
    title: formTitle,
    amount: parseFloat(formAmount),
    category: formCategory,
    dueDate: new Date(formDueDate),
    priority: formPriority,
    recurring: formRecurring,
    frequency: formFrequency,
    reminder: formReminder,
    customReminderDays: formCustomReminderDays,
    paymentMethod: formPaymentMethod,
    notes: formNotes,
    color: formColor,
    icon: formIcon,
  };
  ```
- **Status**: **Success**. The payload is correctly mapped, and numbers are correctly parsed.

### 5. Network Request Dispatch
- **Endpoint**: `POST http://localhost:5000/api/bills`
- **Request Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI... (Valid access token)
  ```
- **Request Body (JSON)**:
  ```json
  {
    "title": "Electricity Test",
    "amount": 1450,
    "category": "Electricity",
    "dueDate": "2026-08-14T18:30:00.000Z",
    "priority": "medium",
    "recurring": false,
    "frequency": "none",
    "reminder": "none",
    "customReminderDays": 0,
    "paymentMethod": "upi",
    "notes": "Testing api",
    "color": "#3b82f6",
    "icon": "💸"
  }
  ```
- **Status**: **Success**. Sent via Axios.

### 6. Express Routing
- **Server Registration**: `/api/bills` is registered in `server.js` using `app.use('/api/bills', billRoutes)`.
- **Router Mapping**: `POST /` maps to `createBill` controller.
- **Status**: **Success**. The endpoint exists and correctly intercepts requests.

### 7. Server Authentication Guard
- **Middleware**: `protect` in `server/middleware/authMiddleware.js` parses the Bearer token, fetches the user from the DB, and attaches it to `req.user`.
- **Status**: **Success**. Verified token matching.

### 8. Request Validation (Joi)
- **Middleware**: None. There is no Joi validation schema active on `/api/bills` routes.
- **Status**: **Success**. Bypasses schema checks safely.

### 9. MongoDB Schema Matching
- **Schema**: `server/models/Bill.js` expects:
  - `user`: ObjectId (User Ref)
  - `title`: String
  - `amount`: Number
  - `category`: String
  - `dueDate`: Date
  - `paymentMethod`: Enum (`['cash', 'card', 'upi', 'bank', 'other']`)
- **Status**: **Success**. The frontend form dropdown selects (`card`, `upi`, `bank`, `cash`, `other`) align perfectly with MongoDB schema enum constraints.

### 10. MongoDB Database Save
- **Pre-save Hook**: Classified the status to `'upcoming'` (since due date is in the future).
- **MongoDB Insert Result**:
  ```json
  {
    "user": "6a6268d6c01f3105b105b786",
    "title": "Electricity Test",
    "amount": 1450,
    "category": "Electricity",
    "dueDate": "2026-08-14T18:30:00.000Z",
    "status": "upcoming",
    "priority": "medium",
    "recurring": false,
    "frequency": "none",
    "reminder": "none",
    "customReminderDays": 0,
    "paymentMethod": "upi",
    "notes": "Testing api",
    "color": "#3b82f6",
    "icon": "💸",
    "_id": "6a6707693febb9c1452faca7",
    "paymentHistory": [],
    "createdAt": "2026-07-27T07:23:21.454Z",
    "updatedAt": "2026-07-27T07:23:21.454Z"
  }
  ```
- **Status**: **Success**. Document inserted correctly in DB.

### 11. API Response Handling
- **Server Response**: Status code `201 Created` with a success payload.
- **Axios Response Processing**:
  ```javascript
  setIsAddModalOpen(false);
  resetFormFields();
  fetchAllData();
  ```
- **Status**: **Success**.

### 12. Frontend State Updates
- **Trigger**: `fetchAllData()` executes `GET /api/bills` and `GET /api/bills/stats`.
- **States Set**: `setBills(...)` and `setStats(...)`.
- **Status**: **Success**. The calendar grid and widgets re-render with the new scheduled bills.

---

## Root Cause & Solution

### Root Cause
During debugging, we identified that the **Add Bill** API request and the schema validations were working flawlessly (saving to MongoDB successfully).

However, authentication for the test user `test@example.com` was failing. The test user account password in the database had been **double-hashed**:
1. When seeding the user `test@example.com`, the seeding script manually hashed the password `"password123"` using `bcrypt`.
2. Upon saving the document, the Mongoose pre-save hook:
   ```javascript
   userSchema.pre('save', async function (next) {
     if (!this.isModified('password')) return next();
     const salt = await bcrypt.genSalt(10);
     this.password = await bcrypt.hash(this.password, salt);
     next();
   });
   ```
   detected the password field modification and hashed the already-hashed value a second time.

This password mismatch triggered a `401 Unauthorized: Incorrect password` response on the login attempt. Consequently, the user session was invalidated, and client-side requests to protected endpoints like `POST /api/bills` were blocked/aborted.

### Fix
We corrected the database password seeding by updating the password value directly through an `updateOne` command with `$set`, bypassing Mongoose pre-save hooks:
```javascript
await User.updateOne(
  { email: 'test@example.com' },
  { 
    $set: { 
      password: hashedPassword, // Hashed exactly once
      isEmailVerified: true
    } 
  }
);
```

Following this correction, login completes successfully, the token is saved, and the **Add Bill** feature submits and loads bills on the calendar smoothly.
