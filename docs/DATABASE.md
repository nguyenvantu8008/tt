# BPOTime - Database Design

## 1. Relational Schema Overview

The database uses PostgreSQL. The schema is highly normalized but allows for specific denormalizations where read performance is critical (e.g., snapshotting payroll data).

## 2. Core Tables

### 2.1 Employees & Users
- **Users**: Authentication credentials, password hashes, status.
- **Roles & Permissions**: RBAC configuration.
- **UserRoles**: Mapping users to roles.
- **Employees**: Profile information (Code, Name, Phone, Email, ID Card, Status, Type, HireDate).
- **SalaryRates**: Historical and current salary configurations (DailyRate, HourlyRate, OTRateMultiplier).

### 2.2 Projects & Assignments
- **Projects**: Project details (Code, Name, Client, Location, StartDate, EndDate, Status, TargetMetrics).
- **ProjectAssignments**: Mapping Employees to Projects with specific Roles and Date ranges.

### 2.3 Time & Attendance
- **Attendance**: Daily attendance records (EmployeeId, ProjectId, Date, CheckInTime, CheckOutTime, Status, Note).
- **AttendanceLogs**: Raw punch logs (if integrating with hardware devices).
- **Overtime**: Specific overtime records (EmployeeId, Date, Hours, MultiplierType, Status, ApprovedBy).
- **LeaveRequests**: Employee leave applications (StartDate, EndDate, Type, Status).

### 2.4 Payroll & Compensation
- **PayrollPeriods**: Monthly payroll cycles (Month, Year, StartDate, EndDate, Status - Draft/Locked/Approved/Closed).
- **PayrollDetails**: Individual employee payroll calculation results (Snapshot data: TotalDays, TotalHours, OTHours, BasicSalary, OTPay, TotalBonus, TotalDeduction, NetSalary).
- **Advances**: Salary advance requests and approvals.
- **Bonuses & Deductions**: Ad-hoc additions or subtractions to salary.
- **Payments**: Records of actual salary disbursement.

### 2.5 Audit & System
- **AuditLogs**: Immutable log of critical actions (UserId, Action, Entity, EntityId, OldValues, NewValues, Timestamp, IP).
- **SystemSettings**: Configurable business rules (WorkHoursPerDay, RoundingRules, etc.).
- **Notifications**: In-app user notifications.

## 3. Critical Indexes for Performance

To handle millions of rows in attendance and payroll, the following indexes are mandatory:

- `idx_attendance_employee_date` on `Attendance (EmployeeId, Date)`
- `idx_attendance_project_date` on `Attendance (ProjectId, Date)`
- `idx_attendance_emp_proj_date` on `Attendance (EmployeeId, ProjectId, Date)`
- `idx_payroll_period_employee` on `PayrollDetails (PayrollPeriodId, EmployeeId)`
- `idx_project_assignments_proj_emp` on `ProjectAssignments (ProjectId, EmployeeId)`

## 4. Data Integrity & Constraints

- Foreign key constraints enforced across all relationships.
- Unique constraints on Employee Code, Project Code, User Email/Username.
- Concurrency tokens (RowVersion) on `Attendance`, `PayrollPeriods`, and `Employees`.
