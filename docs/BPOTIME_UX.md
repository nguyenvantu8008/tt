# BPOTime Information Architecture & UX Specification (BPOTIME_UX.md)

> **Mục tiêu:** Thiết lập cấu trúc trải nghiệm người dùng phân tách hoàn toàn giữa **EMPLOYEE** (Tối giản - Mobile First - 1 Thao tác) và **ADMIN / MANAGER** (Tập trung hành động - Giải quyết ngoại lệ - Kiểm soát chi phí).

---

## 1. Nguyên Tắc Thiết Kế Cốt Lõi (UX Design Philosophy)

1. **Phân ly hoàn toàn 2 trải nghiệm (Zero Confusion):**
   - **EMPLOYEE:** Giao diện thẻ phẳng, di động, không chứa số liệu phân tích của công ty, chỉ phục vụ chấm công cá nhân, theo dõi công và phiếu lương trong vài giây.
   - **ADMIN / MANAGER:** Bảng điều khiển Desktop-first, tập trung trả lời câu hỏi: *"Hôm nay có vấn đề gì cần xử lý ngay?"*.
2. **Quy tắc 1 thao tác chính (Single Primary Action):**
   - Màn hình điểm danh của nhân viên chỉ có 1 nút bấm lớn duy nhất biến đổi trạng thái theo thời gian thực: `[ CHẤM CÔNG VÀO ]` → `[ CHẤM CÔNG RA ]` → `[ ĐÃ HOÀN THÀNH ]`.
3. **Ưu tiên thông tin hành động (Actionable over Visual Fluff):**
   - Dashboard của Admin loại bỏ các biểu đồ trang trí rườm rà, tập trung vào hàng chờ ngoại lệ (Exceptions Queue): Ai chưa vào ca? Ai quên checkout? Ai chấm công ngoài bán kính? Ai xin duyệt tăng ca?
4. **Giữ cấu trúc màn hình tinh gọn (Consolidated Screens):**
   - Không sinh thêm route con nếu có thể giải quyết bằng Tabs hoặc Drawers trong cùng một màn hình trung tâm (ví dụ: `Attendance Center` kết hợp bộ lọc, bảng công và hàng chờ ngoại lệ).

---

## 2. Kiến Trúc Điều Hướng Theo Vai Trò (Role-Based Navigation)

```
                            [ ĐĂNG NHẬP ]
                                  │
                   Kiểm tra Token & Role trong JWT
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            Role: EMPLOYEE             Role: ADMIN / MANAGER
     ┌──────────────────────────┐   ┌──────────────────────────┐
     │  Layout: EmployeeLayout  │   │   Layout: AdminLayout    │
     │  (Mobile Bottom Nav)     │   │   (Desktop Sidebar Mini) │
     ├──────────────────────────┤   ├──────────────────────────┤
     │ 1. Trang chủ (Home)      │   │ 1. TỔNG QUAN             │
     │ 2. Chấm công (Punch)     │   │    - Dashboard           │
     │ 3. Lịch sử (History)     │   │    - Attendance Center   │
     │ 4. Lương (Payslip)       │   │    - Cảnh báo & Ngoại lệ │
     │ 5. Cá nhân (Profile)     │   │ 2. NHÂN SỰ               │
     └──────────────────────────┘   │    - Nhân viên & Phân công
                                    │ 3. DỰ ÁN                 │
                                    │    - Dự án & Tiến độ     │
                                    │ 4. CÔNG & LƯƠNG          │
                                    │    - Bảng công & OT      │
                                    │    - Tính lương (Wizard) │
                                    │ 5. BÁO CÁO & HỆ THỐNG    │
                                    │    - Báo cáo & Audit Log │
                                    └──────────────────────────┘
```

---

## 3. Trải Nghiệm Nhân Viên (EMPLOYEE EXPERIENCE)

### 3.1. Navigation Bar (Mobile-First Bottom Bar)
- Cố định ở đáy màn hình trên thiết bị di động (hỗ trợ Safe-area-inset cho iOS/Android):
  1. 🏠 **Trang chủ** (`/app/home`)
  2. ⏱ **Chấm công** (`/app/punch`)
  3. 📅 **Lịch sử** (`/app/history`)
  4. 💵 **Phiếu lương** (`/app/payslip`)
  5. 👤 **Cá nhân** (`/app/profile`)

### 3.2. Trang Chủ Nhân Viên (`/app/home`)
Hiển thị thẻ tóm tắt tức thì (Card Widget) không cần cuộn:
- **Lời chào & Ngày:** *"Xin chào, [Họ tên nhân viên] 👋"*, Thứ Hai, 19/09/2026.
- **Thẻ trạng thái ca làm việc hôm nay:**
  - Dự án hiện tại: `[Mã dự án] - [Tên dự án]`.
  - Ca làm việc: `Ca Hành Chính (08:00 - 17:00)`.
  - Giờ vào: `07:55` (hoặc `--:--` nếu chưa vào ca).
  - Giờ ra: `17:05` (hoặc `--:--` nếu chưa tan ca).
  - Tổng giờ hôm nay: `8.0 giờ`.
- **Thẻ tích lũy tháng này:**
  - Tổng số ngày công đạt được: `18.5 / 22 ngày`.
  - Giờ tăng ca (OT): `4.5 giờ`.
- **Nút hành động nhanh (Quick Action Banner):**
  - Chuyển thẳng sang tab Chấm công với trạng thái sẵn sàng quét GPS.

### 3.3. Màn Hình Chấm Công Cốt Lõi (`/app/punch`)
Thiết kế tối giản tuyệt đối, phục vụ dập thẻ trong 3 giây:
1. **Radar GPS Trực quan:**
   - Hiển thị khoảng cách tới tâm chi nhánh dự án (VD: *"Bạn đang cách văn phòng 12m - Hợp lệ"* màu xanh ngọc).
   - Nếu ngoài bán kính (> 20m): Tự động hiển thị 2 nút chuyển đổi `[ Đi công tác ]` hoặc `[ Vị trí khác ]` kèm ô nhập ngắn lý do giải trình.
2. **Nút bấm chính duy nhất (Primary Button - Big & Tactile):**
   - **Trạng thái 1 (Chưa check-in):** Nút màu xanh Indigo lớn `[ CHẤM CÔNG VÀO ]`.
   - **Trạng thái 2 (Đã check-in, chưa checkout):** Nút màu hổ phách/cam `[ CHẤM CÔNG RA ]` kèm thời gian vào ca.
   - **Trạng thái 3 (Đã checkout):** Nút màu xám/xanh lá hoàn thành `[ ĐÃ HOÀN THÀNH CA ]` khóa thao tác dập thẻ trùng.

---

## 4. Trải Nghiệm Quản Trị (ADMIN & MANAGER EXPERIENCE)

### 4.1. Cấu Trúc Menu Sidebar Rút Gọn (5 Nhóm Chính)

| Nhóm Menu | Mục Con | Chức Năng Chính |
| :--- | :--- | :--- |
| **TỔNG QUAN** | • Dashboard | Trả lời: Hôm nay có vấn đề gì? Thống kê nhân sự & chi phí. |
| | • Attendance Center | Trung tâm chấm công tập trung, lọc theo ngày/dự án/team, dập thẻ hàng loạt. |
| | • Cảnh báo & Ngoại lệ | Quản lý Missing Check-in, Missing Checkout, OT chờ duyệt, Chấm công ngoài bán kính. |
| **NHÂN SỰ** | • Danh sách Nhân sự | Hồ sơ nhân viên, phân công dự án, ca làm việc, trạng thái hợp đồng. |
| **DỰ ÁN** | • Dự án & Hiện trường | Quản lý danh mục dự án BPO, tọa độ GPS, bán kính Geofence, nhân sự trực thuộc. |
| **CÔNG & LƯƠNG** | • Bảng công tổng hợp | Matrix công theo tháng, xuất Excel SheetJS chuẩn báo cáo. |
| | • Tính lương (Payroll Wizard) | Quy trình 7 bước tính lương backend, khóa kỳ lương, lập lệnh chi trả. |
| **HỆ THỐNG** | • Tài khoản & Audit Log | Phân quyền vai trò (RBAC), lịch sử can thiệp dữ liệu hệ thống. |

### 4.2. Admin Dashboard: "Hôm nay có vấn đề gì?"

Dashboard gồm 3 khối thông tin hành động:

#### Khối 1: Các chỉ số vận hành thời gian thực (Actionable Metrics Bar)
- **Tổng nhân sự (Total Employees):** `150`
- **Đang làm việc (Working):** `132` (Đã vào ca hợp lệ)
- **Chưa vào ca (Not Checked In):** `12` ⚠️ (Nhấp vào để xem danh sách & gửi nhắc nhở)
- **Vắng mặt (Absent):** `6` (Nghỉ phép có phép hoặc không phép)
- **Tăng ca (Overtime):** `14 người` (Tổng `28h OT`)
- **Ngoại lệ chấm công (Exceptions):** `8 vụ` 🚨 (Bấm để mở Exception Center xử lý ngay)
- **Dự án đang chạy (Active Projects):** `6 chi nhánh`
- **Ước tính chi phí nhân công tháng:** `~420,000,000 đ`

#### Khối 2: Hàng đợi Cần Xử Lý Ngay (Exceptions & Pending Approvals)
- Danh sách 5-10 trường hợp nóng nhất cần Admin quyết định:
  - `Nguyễn Văn A`: Check-in ngoài chi nhánh 450m (Lý do: *"Gặp khách hàng tại Q1"* - Chờ duyệt).
  - `Trần Thị B`: Quên checkout ngày hôm qua (Hệ thống đề xuất đóng ca 17:00).
  - `Lê Hoàng C`: Đăng ký tăng ca 2.5h dự án Shopee Hotline.
- Nút bấm duyệt nhanh 1-Click ngay tại hàng: `[ Duyệt ]` / `[ Từ chối ]`.

#### Khối 3: Phân Bổ Nhân Lực Dự Án (Project Deployment Matrix)
- Tiến độ quân số và tỷ lệ đi làm theo từng dự án BPO.

---

## 5. Attendance Center (Trung Tâm Chấm Công Tập Trung)

Thay thế việc phân mảnh giữa `DailyAttendance`, `MonthlyTimesheet`, `OnsiteKiosk`.
- **Mặc định:** Hiển thị ngày hôm nay (`selectedDate = today`).
- **Thanh công cụ lọc đa chiều (Filter Bar):**
  - Date Picker (Hôm nay / Chọn ngày bất kỳ).
  - Dự án (Tất cả / BPO Shopee / BPO Grab / Nội bộ...).
  - Phòng ban / Team (CSKH, Số hóa, Kỹ thuật...).
  - Trạng thái công: `Tất cả` | `Đã vào ca` | `Đã tan ca` | `Chưa chấm công` | `Đi muộn` | `Về sớm` | `Quên checkout` | `Tăng ca`.
- **Bulk Action Bar (Thao tác hàng loạt có xác nhận):**
  - Chọn 10 nhân viên → `[ Gửi nhắc nhở dập thẻ ]`.
  - Chọn 5 nhân viên → `[ Chấm công bù hàng loạt ]`.
  - Chọn 20 nhân viên → `[ Duyệt có mặt đúng giờ ]`.
  - Xuất Excel bảng công ngày/kỳ theo bộ lọc hiện tại.

---

## 6. Attendance Exceptions Center (Trung Tâm Xử Lý Ngoại Lệ)

Tự động phát hiện 8 loại bất thường bằng thuật toán backend:
1. **Missing Check-in:** Nhân viên có lịch trực trong ca nhưng quá 30 phút chưa có bản ghi dập thẻ.
2. **Missing Check-out:** Nhân viên có giờ vào nhưng không có giờ ra khi ca làm việc đã kết thúc > 2 tiếng.
3. **Outside Geofence (> 20m):** Chấm công ngoài bán kính GPS cần Admin kiểm tra tọa độ Google Maps và giải trình.
4. **Invalid Punch Time:** Giờ check-out trước giờ check-in hoặc thời gian làm việc vô lý (> 16 tiếng/ca).
5. **Duplicate Attendance:** Nhiều bản ghi check-in trùng lặp trong khoảng thời gian ngắn.
6. **Unapproved Overtime:** Giờ tan ca thực tế vượt quá giờ kết thúc ca chuẩn nhưng chưa có phiếu duyệt OT.
7. **Late / Early Leave:** Đi muộn > 15 phút hoặc về sớm > 15 phút.
8. **Unassigned Project:** Nhân viên đang làm việc nhưng chưa được gán vào Dự án cụ thể.

Admin có thể xử lý tất cả trên 1 bảng điều khiển duy nhất mà không cần mở từng trang cá nhân.

---

## 7. Hồ Sơ Nhân Viên Theo Tab (Employee Profile Tabs)

Thay vì nhồi nhét tất cả vào 1 modal khổng lồ, hồ sơ nhân sự dùng cấu trúc Tabs chuyên nghiệp:
- **Tab 1: Overview (Tổng quan):** Họ tên, mã NV, ảnh thẻ, CCCD, chức vụ, phòng ban, thông tin liên hệ, tài khoản dập thẻ.
- **Tab 2: Attendance (Lịch sử công):** Lưới chấm công 30 ngày gần nhất, tỷ lệ đúng giờ, GPS heatmap.
- **Tab 3: Projects (Dự án & Ca):** Lịch sử phân công dự án, ca làm việc hiện tại, người quản lý trực tiếp.
- **Tab 4: Payroll (Lương thưởng):** Mức lương cơ bản, hệ số OT, phụ cấp, tài khoản ngân hàng chi trả, lịch sử phiếu lương.
- **Tab 5: Activity (Nhật ký):** Lịch sử can thiệp, chỉnh sửa hồ sơ, audit log.

---

## 8. Quy Trình Tính Lương 7 Bước (Payroll Engine Wizard)

Chuyển đổi toàn bộ logic tính lương từ giao diện React về **Backend PayrollCalculationService**:

```
[ BƯỚC 1: Chọn kỳ & Rà soát Bảng công ]
   ↓  Kiểm tra đủ ngày công, lọc ngoại lệ chưa xử lý
[ BƯỚC 2: Thẩm định Tăng ca (Review OT) ]
   ↓  Khóa danh sách giờ OT được duyệt
[ BƯỚC 3: Kích hoạt Máy tính Lương Backend (Calculate) ]
   ↓  Lương cứng + (Lương giờ * Hệ số OT) + Phụ cấp - Khấu trừ
[ BƯỚC 4: Rà quét Dị thường (Anomaly Detection) ]
   ↓  Cảnh báo lương âm, lương tăng đột biến > 50%, thiếu tài khoản NH
[ BƯỚC 5: Ban Giám Đốc Duyệt Kỳ Lương (Approve) ]
   ↓  Phê duyệt cấp quản lý
[ BƯỚC 6: Lập Lệnh Thanh Toán (Payment) ]
   ↓  Xuất file chuyển khoản ngân hàng (Vietcombank, MB, Techcombank)
[ BƯỚC 7: Khóa Sổ Kỳ Lương (Lock Payroll Period) ]
      Đóng băng dữ liệu, cấm sửa đổi, chỉ cho phép lập Adjustment kèm Audit Log.
```

---
*Tài liệu được lưu trữ tại `docs/BPOTIME_UX.md`.*
