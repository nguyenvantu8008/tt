# BPOTime System Audit Report (BPOTIME_AUDIT.md)

> **Mục tiêu:** Đánh giá toàn diện kiến trúc hiện tại, xác định các điểm nghẽn về UX, bảo mật, hiệu năng, cấu trúc dữ liệu và API; từ đó đề xuất lộ trình chuẩn hóa hệ thống theo mô hình Enterprise SaaS đáp ứng quy mô 1,000+ nhân sự và hàng triệu bản ghi chấm công.

---

## 1. Architecture Hiện Tại

### 1.1. Công nghệ cốt lõi
- **Frontend Framework:** React 19 (`19.2.8`), TypeScript 6 (`~6.0.2`), Vite 8 (`8.3.0`), Tailwind CSS v3 (`3.4.17`), React Router DOM v7 (`7.18.3`), Lucide React (`1.45.0`), Axios (`1.20.0`), SheetJS/XLSX (`0.18.5`).
- **Backend Framework:** .NET 8 (C# 12) Minimal APIs, ASP.NET Core Web API.
- **Data Access:** Entity Framework Core 8 (`8.0.8`) with Npgsql (`8.0.8`) PostgreSQL provider.
- **Database Engine:** PostgreSQL (Cloud instance / Supabase / Neon / Render Postgres).
- **Authentication & Security:** JWT Bearer tokens (HMAC-SHA256, `IJwtProvider`), BCrypt.Net-Next (`4.0.3`) for password hashing.
- **Logging & Telemetry:** Serilog (`Serilog.AspNetCore 8.0.2`) ghi rolling daily log (`app-.log`, `errors-.log`) và endpoint nhận client telemetry (`/api/logs/client-error`).

### 1.2. Phân lớp dự án (Clean Architecture sơ khai)
```
c:\PHAN MEM\app cham cong\
├── src\
│   ├── BPOTime.Domain\            # Entities: Attendance, Employee, LeaveRequest, Project, Role, Shift, User, UserRole
│   │                              # Enums: AttendanceStatus, EmployeeStatus
│   ├── BPOTime.Application\       # Common DTOs (ApiResponse, ApiErrorResponse), Authentication (IJwtProvider)
│   │                              # => Thực tế: Hầu hết logic nghiệp vụ đang bị bỏ trống ở Application layer
│   ├── BPOTime.Infrastructure\    # EF Core DbContext, Configurations, Migrations, DatabaseSeeder, BCrypt/JWT
│   └── BPOTime.Api\               # Program.cs, Endpoints (Attendance, Employee, Project, Shift, Geo)
└── bpotime-web\                   # Single Page Application (Vite + React)
    ├── src\pages\                 # Login, Dashboard, MyAttendance, OnsiteKiosk, DailyAttendance, MonthlyTimesheet, EmployeeList, ProjectList
    ├── src\components\layout\     # AppLayout.tsx (Sidebar navigation dùng chung)
    └── src\lib\                   # geoUtils.ts, clientLogger.ts, excelExport.ts
```

### 1.3. Nhận định kiến trúc
- **Tích cực:** Tách biệt rõ ràng 4 project .NET, sử dụng `Fluent API` Configurations trong Infrastructure, Dockerfile multi-stage build hỗ trợ deploy cloud tự động.
- **Hạn chế nghiêm trọng:**
  - `BPOTime.Application` gần như bị bỏ qua: Controller/Endpoint methods trong `BPOTime.Api/Endpoints` đang trực tiếp thao tác `ApplicationDbContext`, viết query LINQ và business logic tại chỗ.
  - Frontend không có Global State Management (Zustand hoặc TanStack Query Provider dù đã cài `@tanstack/react-query`), trạng thái nằm phân tán trong từng `useState` cục bộ, dẫn đến việc fetch trùng lặp liên tục khi đổi trang.
  - Chưa có Service Layer cho tính toán công và lương (Payroll Engine). Tính lương đang bị tính toán tạm thời bằng JavaScript trên giao diện `MonthlyTimesheet.tsx`.

---

## 2. UX Problems (Vấn đề Trải nghiệm Người dùng)

1. **Dùng chung 1 giao diện cho cả Admin và Employee:**
   - Khi Employee đăng nhập, hệ thống điều hướng vào `/dashboard` (màn hình hiển thị số liệu toàn công ty, danh sách nhân viên, tổng dự án...).
   - Employee bị choáng ngợp bởi menu quản trị, dù một số nút bị ẩn bằng JS nhưng cấu trúc trang vẫn là của Quản lý.
2. **Thiếu trải nghiệm Mobile-First cho Employee:**
   - Employee thường truy cập bằng điện thoại thông minh (4G/GPS) tại công trình hoặc văn phòng, nhưng giao diện hiển thị sidebar desktop thu nhỏ, table quá rộng phải cuộn ngang.
   - Thao tác cốt lõi nhất của nhân viên là **"Chấm công vào"** và **"Chấm công ra"** lại đòi hỏi phải tìm kiếm hoặc qua nhiều bước.
3. **Admin Dashboard không trả lời được câu hỏi: *"Hôm nay có vấn đề gì?"*:**
   - Dashboard hiện tại chỉ thống kê chung chung (Tổng số nhân viên, Dự án, Giờ chấm công gần nhất).
   - Admin không thấy ngay danh sách các trường hợp khẩn cấp: Ai chưa chấm công vào? Ai quên checkout hôm qua? Ai chấm công ngoài bán kính GPS cần duyệt giải trình? Ai tăng ca chưa phê duyệt?
4. **Không có Attendance Center tập trung:**
   - Phân mảnh giữa "Điểm danh hàng ngày" (`DailyAttendance`), "Bảng công tháng" (`MonthlyTimesheet`), "Kiosk hiện trường" (`OnsiteKiosk`) và "Chấm công cá nhân" (`MyAttendance`).
5. **Modal và Form quá nhiều trường:**
   - Modal Thêm nhân viên và Chấm công bù có quá nhiều input không cần thiết hiển thị cùng lúc, thiếu wizard hoặc progressive disclosure.

---

## 3. Duplicate Features (Tính năng Trùng lặp)

1. **Trùng lặp chức năng Chấm công (Punch In/Out):**
   - Xuất hiện ở **3 trang khác nhau**:
     - `Dashboard.tsx`: Khối widget bấm "Bắt đầu ca làm việc / Kết thúc ca".
     - `MyAttendance.tsx`: Màn hình "Chấm công cá nhân (GPS)" với radar quét và bản đồ.
     - `OnsiteKiosk.tsx`: Màn hình "Kiosk Hiện Trường" cho phép chọn nhân viên và bấm dập thẻ.
   - Cả 3 trang đều lặp lại logic quét GPS, tính khoảng cách Haversine, gửi request `/api/attendance/check-in` và `/api/attendance/check-out`.
2. **Trùng lặp chức năng Giả lập GPS (Admin Simulate GPS):**
   - Cả `MyAttendance.tsx` và `OnsiteKiosk.tsx` đều có cùng 1 đoạn code copy-paste để giả lập GPS cho Admin test trên máy tính.
3. **Trùng lặp Modal Chấm công bù (`MakeupAttendanceModal`):**
   - Được nhúng độc lập tại `DailyAttendance.tsx`, `EmployeeList.tsx`, và một số action khác.
4. **Trùng lặp API `/today` và `/daily`:**
   - `/api/attendance/today` và `/api/attendance/daily?date=...` có query LINQ giống hệt nhau 100%, gây phân tán endpoint.

---

## 4. Unnecessary Features (Tính năng Thừa / Rác Code)

1. **Endpoint mẫu `/weatherforecast`:**
   - Còn tồn tại trong `Program.cs` (dòng 142 - 158 và dòng 171 - 174).
2. **Widget đồng hồ nhảy giây trên Header & Dashboard:**
   - Chạy `setInterval` mỗi 1000ms gây re-render không cần thiết toàn bộ Header component.
3. **Mô phỏng đếm giờ làm việc (Stopwatch Timer) ở client:**
   - Dùng `setInterval` đếm giây `elapsedSeconds` trong `Dashboard.tsx` và `MyAttendance.tsx`. Thời gian thực tế phải lấy từ chênh lệch timestamp server, không được dựa vào state frontend (sẽ bị lệch khi chuyển tab hoặc khóa màn hình điện thoại).
4. **Các nút quick-fill mật khẩu hardcoded:**
   - Cần loại bỏ hoặc đóng gói vào chế độ `development-only` để tránh rủi ro bảo mật môi trường production.

---

## 5. Performance Bottlenecks (Điểm nghẽn Hiệu năng)

1. **Thiếu Server-Side Pagination & Filtering:**
   - `GET /api/employees`: Đang `db.Employees.ToListAsync()`. Với 1,000+ nhân sự, payload trả về toàn bộ danh sách, kèm ảnh đại diện và navigation properties.
   - `GET /api/projects`: Trả về toàn bộ danh sách dự án.
   - `GET /api/attendance/range`: Đang tải toàn bộ bản ghi của khoảng ngày không giới hạn.
2. **Thiếu `.AsNoTracking()` trong hầu hết truy vấn đọc (Read Queries):**
   - Các endpoint `GET /api/attendance/daily`, `GET /api/attendance/today`, `GET /api/attendance/range`, `GET /api/attendance/monthly`, `GET /api/employees` đều không dùng `.AsNoTracking()`.
   - EF Core phải duy trì Change Tracker cho hàng nghìn entity, gây ngốn RAM và làm chậm thời gian phản hồi CPU gấp 2 - 3 lần.
3. **N+1 Query & xử lý tính toán trong Memory ở `/api/attendance/monthly`:**
   - Tải toàn bộ nhân viên và toàn bộ chấm công trong tháng về memory rồi dùng `records.Where(r => r.EmployeeId == emp.Id).ToList()`.
   - Khi có 500 nhân sự và 15,000 bản ghi/tháng, thao tác lặp này làm block thread pool của Kestrel.
4. **Client-side Search & Filtering:**
   - Bộ lọc tìm kiếm nhân viên, dự án, phòng ban hiện tại đang lọc bằng `Array.prototype.filter()` trên client. Dữ liệu lớn sẽ gây đơ giật giao diện (UI freeze).
5. **Re-render liên tục trên React 19:**
   - Do không sử dụng memoization (`useCallback`, `useMemo`) hợp lý cho các handler chọn hàng loạt (`selectedEmpIds`, `selectedRowEmpIds`).

---

## 6. Security Risks (Rủi ro An ninh Thông tin)

1. **Lỗ hổng IDOR & Thiếu Authorization Enforce tại Backend (Nghiêm trọng):**
   - Endpoint `/api/attendance/check-in` và `/api/attendance/check-out` nhận `EmployeeId` trực tiếp từ Request Body.
   - Backend **KHÔNG** kiểm tra xem `EmployeeId` đó có thuộc về User đang đăng nhập qua JWT hay không!
   - Bất kỳ ai biết ID nhân viên khác đều có thể gửi request để chấm công hộ hoặc checkout người khác.
2. **Endpoints không yêu cầu Authentication (`.RequireAuthorization()`):**
   - Hầu hết các endpoint trong `AttendanceEndpoints.cs`, `EmployeeEndpoints.cs`, `ProjectEndpoints.cs` đều không có `.RequireAuthorization()`.
   - Bất kỳ ai gọi trực tiếp URL API từ Postman/Curl đều đọc và xóa được dữ liệu nhân sự mà không cần Bearer token!
3. **CORS mở toàn bộ (`AllowAnyOrigin` via `SetIsOriginAllowed(_ => true)`):**
   - Trong `Program.cs`, CORS đang cho phép bất kỳ domain nào kết nối kèm credentials. Cần giới hạn whitelist domain production.
4. **Không có Rate Limiting:**
   - Không có giới hạn tần suất gọi API đăng nhập `/api/auth/login` và chấm công `/api/attendance/check-in`, có nguy cơ bị brute-force mật khẩu hoặc spam request dập thẻ.
5. **Lưu Token và User Data thô trong `localStorage`:**
   - Dễ bị đánh cắp nếu gặp lỗ hổng XSS từ các thư viện bên thứ ba.

---

## 7. Database Problems (Vấn đề Cơ sở Dữ liệu)

1. **Thiếu các thực thể lõi của hệ thống Quản lý Hiện trường & Lương:**
   - Hiện tại **CHƯA CÓ**:
     - Bảng `WorkSessions` (phiên làm việc chi tiết trong ngày, tách biệt với ngày công tổng quát).
     - Bảng `ProjectAssignments` (quản lý lịch sử phân công nhân viên vào dự án theo thời gian từ ngày - đến ngày; hiện chỉ có 1 trường `ProjectId` duy nhất trong `Employee`).
     - Bảng `Overtimes` (quản lý yêu cầu tăng ca, phê duyệt OT có cấp quản lý ký duyệt).
     - Bảng `PayrollPeriods`, `PayrollDetails`, `Payments` (chưa có mô hình lương chuẩn, hiện đang tính nhẩm trên giao diện).
     - Bảng `AuditLogs` (chưa có bảng lưu vết chỉnh sửa dữ liệu nhạy cảm).
2. **Thiếu Audit Fields chuẩn trên các bảng:**
   - Bảng `Employees`, `Projects`, `Shifts`, `Users` thiếu các trường: `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `IsDeleted` (Soft Delete).
3. **Thiếu Index tối ưu truy vấn lớn:**
   - `Attendances` cần index tổng hợp: `(Date, Status)`, `(EmployeeId, Date, Status)`.
   - `Projects` thiếu index theo `Status`.
   - `Employees` thiếu index theo `Status`, `Department`, `ProjectId`.

---

## 8. API Problems (Vấn đề Giao diện Lập trình Ứng dụng)

1. **Chuẩn hóa Response không đồng nhất:**
   - Dự án đã định nghĩa `ApiResponse<T>` và `ApiErrorResponse` trong `BPOTime.Application/Common`, nhưng các Endpoint lại trả về object ẩn danh `Results.Ok(new { ... })` hoặc mảng thô `Results.Ok(records)`.
   - Frontend không thể có contract TypeScript chuẩn (`code`, `message`, `data`, `errors`, `traceId`).
2. **Exception Handling chưa triệt để:**
   - Dù có `ExceptionHandlingMiddleware`, nhiều lỗi validate param chuỗi ngày tháng đang trả về các format khác nhau (`Results.BadRequest(new { message = "..." })` vs validation error).
3. **Thiếu API Contract Versioning:**
   - Toàn bộ endpoint đang gắn cứng `/api/...`, chưa có prefix phiên bản `/api/v1/...`.

---

## 9. Mobile Problems (Vấn đề Thiết bị Di động)

1. **Bố cục Sidebar Desktop ép buộc trên Mobile:**
   - `AppLayout.tsx` vẫn duy trì thanh sidebar drawer trượt ra che kín màn hình, không phù hợp thói quen sử dụng ngón tay cái (Thumb-driven navigation) trên điện thoại.
2. **Thiếu Bottom Navigation Bar cho Employee:**
   - Trên mobile, Employee cần một Bottom Nav bar 4-5 tab tiện lợi: `Trang chủ`, `Chấm công`, `Lịch sử`, `Lương`, `Cá nhân`.
3. **Trải nghiệm GPS trên trình duyệt Mobile:**
   - `navigator.geolocation.getCurrentPosition` có thể bị timeout hoặc chặn quyền vị trí (Permissions Policy). Thiếu màn hình hướng dẫn người dùng bật quyền vị trí rõ ràng và xử lý sai số bán kính (Accuracy circle).

---

## 10. Recommended Refactoring Plan (Lộ trình Đề xuất Tối ưu)

Để đạt mục tiêu hệ thống chuyên nghiệp, tinh gọn, tốc độ cao và đáp ứng quy mô lớn, chúng ta thực hiện theo 12 Phase chuẩn:

```
[Phase 1] Audit toàn bộ hệ thống (Hoàn thành - BPOTIME_AUDIT.md)
   ↓
[Phase 2] Thiết kế Kiến trúc Thông tin & UX Độc Lập (BPOTIME_UX.md)
   ↓
[Phase 3] Role-Based Routing & Guard (Tách Admin & Employee Layout)
   ↓
[Phase 4] Trải nghiệm Mobile-First cho Employee (Bottom Nav + 1-Tap Punch)
   ↓
[Phase 5] Admin Dashboard Hành Động ("Hôm nay có vấn đề gì?")
   ↓
[Phase 6] Attendance Center (Trung tâm Chấm công Hợp nhất)
   ↓
[Phase 7] Exception Center (Trung tâm Xử lý Ngoại lệ Chấm công)
   ↓
[Phase 8] Chuẩn hóa Quản lý Dự án & Phân công Nhân sự
   ↓
[Phase 9] Payroll Engine & Quy trình Tính Lương 7 Bước (Payroll Wizard)
   ↓
[Phase 10] Tối ưu Hiệu năng (Pagination, AsNoTracking, Virtualization, Index)
   ↓
[Phase 11] Bảo mật & Audit Log (Enforce JWT Claims, IDOR Prevention, Activity Logging)
   ↓
[Phase 12] Kiểm thử Toàn diện & Bàn giao Hệ thống
```

---
*Tài liệu được khởi tạo và lưu trữ tại `docs/BPOTIME_AUDIT.md`.*
