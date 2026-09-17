# BPOTime - Implementation Plan

## 1. Project Initialization

- Set up Git repository.
- Initialize ASP.NET Core Web API project (Backend).
- Initialize React + Vite + TypeScript project (Frontend).
- Configure Docker & Docker Compose for local development (PostgreSQL, Redis).

## 2. Phase 1: Foundation (Architecture, DB, Auth)
- Setup Entity Framework Core and PostgreSQL provider.
- Define initial DbContext and Core Entities (User, Role, Employee).
- Implement JWT Authentication and RBAC middleware.
- Setup Serilog logging.
- Setup generic Repository/UnitOfWork (if deemed necessary) and standard API response wrappers.
- Frontend: Setup Vite, Tailwind, shadcn/ui, TanStack Query, Axios, React Router.
- Frontend: Implement Login screen and protected route wrappers.

## 3. Phase 2: Core Management (Employees & Projects)
- Backend: CRUD endpoints for Employees and Projects.
- Backend: Implement Project Assignments logic.
- Frontend: Employee List (Data Table with pagination), Employee Form.
- Frontend: Project List, Project Detail, Project Assignment interfaces.

## 4. Phase 3: Time and Attendance
- Backend: Attendance endpoints, bulk save logic, Overtime endpoints.
- Backend: Implement robust concurrency handling for Attendance records.
- Frontend: Fast Daily Attendance screen (optimized for speed, bulk actions).
- Frontend: Monthly Timesheet view (Virtualized table).

## 5. Phase 4: Payroll Engine
- Backend: Implement `IPayrollCalculationService`.
- Backend: Payroll Periods management endpoints (Create, Calculate, Lock, Approve).
- Backend: Setup Background Job processor (Hangfire/Quartz) for calculation.
- Frontend: Payroll Dashboard, Calculation trigger UI, Review screen.

## 6. Phase 5: Financials & Reports
- Backend: Advances, Bonuses, Deductions, Payments.
- Backend: Export Services (Excel generation via EPPlus, PDF generation).
- Frontend: Financial management screens, Payslip view, Export triggers.

## 7. Phase 6: Dashboards & Analytics
- Backend: Complex aggregate queries for Dashboard metrics and Labor Cost analytics.
- Frontend: Implement Recharts, Main Dashboard, Project-specific Dashboards.

## 8. Phase 7: Optimization & Polish
- Database index tuning based on query analysis.
- Redis caching implementation for heavy read-only queries.
- Frontend performance review (memoization, render cycle optimization).
- UX polish (Toasts, Loading skeletons, error boundaries).

## 9. Phase 8: Deployment & Testing
- Write automated tests for Payroll Calculation logic (Critical).
- Finalize Dockerfiles for Prod deployment.
- Deployment documentation.
