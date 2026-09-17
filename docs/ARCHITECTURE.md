# BPOTime - System Architecture

## 1. System Overview

BPOTime is a comprehensive enterprise-grade web application designed for BPO (Business Process Outsourcing) and document digitization companies. The system integrates Employee Management, Project Management, Time and Attendance (T&A), Productivity Tracking, Payroll Processing, and Labor Cost Analytics into a single platform.

## 2. Architectural Principles

The system is built upon the following core architectural principles:
- **Clean Architecture & Domain-Driven Design (DDD)**: Separation of concerns across Domain, Application, Infrastructure, and Presentation layers.
- **API-First Design**: The backend serves as a stateless RESTful API, consumed by a Single Page Application (SPA) frontend.
- **High Performance & Scalability**: Designed to handle 1000+ employees and millions of attendance records without degradation.
- **Security-First**: Robust Authentication (JWT), Role-Based Access Control (RBAC), Data validation, and Audit Logging.
- **Asynchronous Processing**: Heavy operations (Payroll calculation, bulk imports/exports) are offloaded to background job queues.

## 3. Technology Stack

### Backend
- **Framework**: ASP.NET Core 8/9
- **Language**: C#
- **ORM**: Entity Framework Core
- **Database**: PostgreSQL
- **Caching**: Redis (Distributed Cache)
- **Authentication**: JWT (JSON Web Tokens) with Refresh Tokens
- **Validation**: FluentValidation
- **Logging**: Serilog
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **State Management (Server)**: TanStack Query (React Query)
- **Table Management**: TanStack Table (with virtualized rendering)
- **Forms & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts

### Deployment & DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server/Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions / GitLab CI (TBD)

## 4. Logical Architecture

### 4.1 Backend Layers
- **Domain Layer**: Contains enterprise logic, entities (Employee, Project, Attendance, PayrollPeriod), value objects, and domain interfaces.
- **Application Layer**: Contains business use cases (Commands/Queries), DTOs, Validation rules, and Application service interfaces.
- **Infrastructure Layer**: Implementation of EF Core DbContext, repositories, caching, external API integrations, email services, and authentication providers.
- **API Layer (Presentation)**: Controllers, Minimal APIs, Middleware (Error handling, Logging), Swagger setup.

### 4.2 Frontend Architecture
- **Pages/Routes**: Top-level route components.
- **Features**: Grouped by business domain (e.g., `features/attendance`, `features/payroll`).
- **Components**: Reusable UI components (buttons, inputs, modals).
- **Hooks**: Custom React hooks for business logic and data fetching.
- **Services**: API client configurations (Axios/Fetch).
- **Store**: Global state (if necessary) and React Query configurations.

## 5. Key Design Patterns & Practices

- **CQRS (Command Query Responsibility Segregation)**: Separating read and write operations, optimizing read queries using Dapper if EF Core projections are not fast enough for specific reports.
- **Repository & Unit of Work**: Abstracting database access (though EF Core inherently acts as UoW/Repo, we may use thin wrappers for specific aggregate roots).
- **Optimistic Concurrency**: Handling simultaneous edits (e.g., Attendance records, Payroll approvals) using RowVersion/Concurrency tokens to prevent data overwrites.
- **Stateless Backend**: Session state is not stored on the server. JWT tokens handle authentication.

## 6. Scalability & Performance Strategies

- **Database Optimization**: Strategic use of composite indexes (e.g., on `EmployeeId` + `AttendanceDate`).
- **Pagination & Virtualization**: API endpoints will enforce pagination. The frontend will utilize virtualized lists (`react-virtual`) for displaying large datasets (e.g., monthly timesheets).
- **Caching**: Redis caching for frequently accessed, infrequently changing data (e.g., System Settings, Public Holidays, basic Employee lists).
- **Background Jobs**: Utilizing Hangfire or Quartz.NET for async tasks like Payroll Generation, Report Generation, and Bulk Excel Imports.
