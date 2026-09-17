# BPOTime - Business Rules & Logic

## 1. Time and Attendance Rules

### 1.1 Standard Work Hours
- **WorkHoursPerDay**: Defined in `SystemSettings` (e.g., 8 hours = 1 Work Day).
- **Standard Shifts**: Configurable start/end times and lunch breaks (e.g., 08:00 - 17:00, Lunch 12:00 - 13:00).

### 1.2 Calculation of Work Days
- Calculated based on actual logged hours divided by `WorkHoursPerDay`.
- Example: 8 hours = 1 day, 4 hours = 0.5 days, 2 hours = 0.25 days.
- **Rounding Rules**: Configurable (e.g., round to nearest 0.25, round down, exact minutes).

### 1.3 Multi-Project Attendance
- An employee can log hours across multiple projects on the same day.
- Total hours per day across all projects dictate the daily total.
- Database must record hours *per project* for accurate labor cost allocation.

## 2. Overtime (OT) Rules

- Overtime must be explicitly logged and approved (or auto-calculated based on settings).
- **Multipliers** (Configurable):
  - Standard Weekday OT: 1.5x
  - Weekend OT: 2.0x
  - Public Holiday OT: 3.0x
- OT Pay = (Daily Salary / WorkHoursPerDay) * Multiplier * OTHours.

## 3. Payroll Calculation Engine

The `IPayrollCalculationService` is the core engine. It must follow strict chronological rules:

### 3.1 Calculation Formula
`Gross Salary = (Total Work Days * Daily Rate) + (OT Hours * Hourly Rate * OT Multiplier) + Allowances + Bonuses`
`Net Salary = Gross Salary - Deductions - Advances`

### 3.2 Payroll Lifecycle State Machine
1. **DRAFT**: Attendance is being gathered. Calculations can be run and re-run safely.
2. **LOCKED**: Attendance for the period can no longer be modified by standard users. Final calculations are generated.
3. **APPROVED**: Manager/Accountant approves the payroll. Values become immutable snapshots.
4. **PAID**: Payments are disbursed.
5. **CLOSED**: Archival state.

### 3.3 Immutability
Once a Payroll Period is APPROVED, all dependent data (Attendance, OT, Advances, Rates) *for that period* is snapshotted into `PayrollDetails`. Subsequent changes to an Employee's current Salary Rate will NOT affect past approved payrolls.

## 4. Labor Cost Allocation

- Every hour logged against a Project carries a monetary cost.
- **Hourly Cost** = Employee's Daily Rate / WorkHoursPerDay.
- **Project Labor Cost** = Sum of (Hourly Cost * Hours Worked on Project) for all assigned employees + applicable OT + Project-specific Bonuses.

## 5. Security & RBAC

- **Super Admin**: System configuration, all access.
- **Admin**: Full operational access, user management.
- **HR**: Employee management, overall attendance.
- **Accountant**: Payroll generation, advances, payments.
- **Project Manager**: Manage their assigned projects, view project labor costs, approve project OT.
- **Team Leader**: Manage attendance for their specific team members.
- **Employee**: View own attendance, payslips, submit leave.
