# BPOTime - API Design Guidelines

## 1. RESTful Principles

The API adheres to RESTful conventions.
- Nouns are used for resources (e.g., `/api/employees`).
- Plural nouns are standard.
- HTTP methods dictate actions (GET, POST, PUT, DELETE, PATCH).

## 2. Standard Responses

All API responses (especially errors) will follow a standardized wrapper to ensure consistent frontend parsing.

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 1250,
    "totalPages": 25
  }
}
```

### Error Response (Problem Details format)
```json
{
  "code": "VALIDATION_ERROR",
  "message": "One or more validation errors occurred.",
  "errors": {
    "Email": ["Invalid email format."]
  },
  "traceId": "00-1234567890abcdef-1234567890abcdef-01"
}
```

## 3. Core Endpoints Overview

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`

### Employees
- `GET /api/employees` (Supports pagination, sorting, filtering)
- `GET /api/employees/{id}`
- `POST /api/employees`
- `PUT /api/employees/{id}`
- `POST /api/employees/import` (File upload)

### Projects
- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `GET /api/projects/{id}/cost-analytics`

### Attendance
- `GET /api/attendance` (Query params: date, projectId, employeeId)
- `POST /api/attendance`
- `POST /api/attendance/bulk` (Fast bulk save)
- `PUT /api/attendance/{id}`

### Payroll
- `GET /api/payroll/periods`
- `POST /api/payroll/periods`
- `POST /api/payroll/periods/{id}/calculate` (Triggers background job)
- `POST /api/payroll/periods/{id}/lock`
- `POST /api/payroll/periods/{id}/approve`
- `GET /api/payroll/periods/{id}/details` (Returns calculated payslips)

### Analytics & Dashboard
- `GET /api/dashboard/overview`
- `GET /api/dashboard/productivity`
