using BPOTime.Domain.Entities;
using BPOTime.Domain.Enums;
using BPOTime.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BPOTime.Api.Endpoints;

public static class AttendanceEndpoints
{
    public static void MapAttendanceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/attendance").WithTags("Attendance");

        // 1. Get daily attendance for all employees (supports ?date=YYYY-MM-DD or defaults to today)
        group.MapGet("/daily", async ([FromQuery] string? date, ApplicationDbContext db) =>
        {
            DateOnly targetDate;
            if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsedDate))
            {
                targetDate = parsedDate;
            }
            else
            {
                targetDate = DateOnly.FromDateTime(DateTime.UtcNow);
            }

            var records = await db.Attendances
                .Include(a => a.Employee)
                .Include(a => a.Project)
                .Include(a => a.Shift)
                .Where(a => a.Date == targetDate)
                .Select(a => new
                {
                    a.Id,
                    a.EmployeeId,
                    EmployeeName = a.Employee.FullName,
                    EmployeeCode = a.Employee.Code,
                    EmployeeAvatar = a.Employee.Avatar,
                    EmployeeDepartment = a.Employee.Department,
                    a.ProjectId,
                    ProjectCode = a.Project.Code,
                    ProjectColor = a.Project.Color,
                    a.ShiftId,
                    ShiftCode = a.Shift.Code,
                    ShiftName = a.Shift.Name,
                    Date = a.Date.ToString("yyyy-MM-dd"),
                    CheckIn = a.CheckInTime.HasValue ? a.CheckInTime.Value.ToString("HH:mm") : null,
                    CheckOut = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm") : null,
                    Status = a.Status.ToString().ToUpper(),
                    a.WorkedHours,
                    a.OtHours,
                    a.Notes,
                    a.IsGpsVerified,
                    a.DistanceToProjectMeters,
                    a.CheckInDevice
                })
                .ToListAsync();

            return Results.Ok(records);
        });

        // 1b. Backward-compatible /today
        group.MapGet("/today", async (ApplicationDbContext db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            
            var records = await db.Attendances
                .Include(a => a.Employee)
                .Include(a => a.Project)
                .Include(a => a.Shift)
                .Where(a => a.Date == today)
                .Select(a => new
                {
                    a.Id,
                    a.EmployeeId,
                    EmployeeName = a.Employee.FullName,
                    EmployeeCode = a.Employee.Code,
                    EmployeeAvatar = a.Employee.Avatar,
                    EmployeeDepartment = a.Employee.Department,
                    a.ProjectId,
                    ProjectCode = a.Project.Code,
                    ProjectColor = a.Project.Color,
                    a.ShiftId,
                    ShiftCode = a.Shift.Code,
                    ShiftName = a.Shift.Name,
                    Date = a.Date.ToString("yyyy-MM-dd"),
                    CheckIn = a.CheckInTime.HasValue ? a.CheckInTime.Value.ToString("HH:mm") : null,
                    CheckOut = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm") : null,
                    Status = a.Status.ToString().ToUpper(),
                    a.WorkedHours,
                    a.OtHours,
                    a.Notes,
                    a.IsGpsVerified,
                    a.DistanceToProjectMeters,
                    a.CheckInDevice
                })
                .ToListAsync();

            return Results.Ok(records);
        });

        // 1c. Employee Attendance History Logs
        group.MapGet("/employee/{employeeId:guid}/history", async (Guid employeeId, [FromQuery] int? limit, ApplicationDbContext db) =>
        {
            var maxLimit = limit ?? 60;
            var history = await db.Attendances
                .Include(a => a.Project)
                .Include(a => a.Shift)
                .Where(a => a.EmployeeId == employeeId)
                .OrderByDescending(a => a.Date)
                .Take(maxLimit)
                .Select(a => new
                {
                    a.Id,
                    Date = a.Date.ToString("yyyy-MM-dd"),
                    CheckIn = a.CheckInTime.HasValue ? a.CheckInTime.Value.ToString("HH:mm") : null,
                    CheckOut = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm") : null,
                    Status = a.Status.ToString().ToUpper(),
                    a.WorkedHours,
                    a.OtHours,
                    a.Notes,
                    a.IsGpsVerified,
                    a.DistanceToProjectMeters,
                    a.CheckInDevice,
                    ProjectName = a.Project.Name,
                    ProjectCode = a.Project.Code,
                    ShiftName = a.Shift.Name
                })
                .ToListAsync();

            return Results.Ok(history);
        });

        // 2. Personal Check-In with GPS Geofencing
        group.MapPost("/check-in", async ([FromBody] CheckInRequest request, ApplicationDbContext db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var nowTime = TimeOnly.FromDateTime(DateTime.Now);

            var employee = await db.Employees
                .Include(e => e.Shift)
                .FirstOrDefaultAsync(e => e.Id == request.EmployeeId);

            if (employee == null)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var projectId = request.ProjectId ?? employee.ProjectId;
            var shiftId = employee.ShiftId;

            if (projectId == null || shiftId == null)
            {
                return Results.BadRequest(new { message = "Nhân viên chưa được phân công Dự án hoặc Ca làm việc." });
            }

            // GPS Geofencing Check
            var project = await db.Projects.FindAsync(projectId);
            double? distance = null;
            bool isGpsVerified = false;

            if (request.IsRemoteLeader == true)
            {
                // Đội trưởng duyệt/điểm danh từ xa (Ủy quyền không bị chặn GPS)
                isGpsVerified = true;
                distance = null;
                Serilog.Log.Information("[KIOSK_REMOTE_CHECKIN] Đội trưởng ủy quyền điểm danh từ xa cho {Emp} tại dự án {Proj}", employee.FullName, project?.Code);
            }
            else if (project != null && project.RequireGps && project.Latitude.HasValue && project.Longitude.HasValue)
            {
                if (!request.Latitude.HasValue || !request.Longitude.HasValue)
                {
                    return Results.BadRequest(new 
                    { 
                        message = "Dự án yêu cầu bật định vị GPS. Vui lòng cho phép quyền vị trí trên điện thoại để chấm công.",
                        code = "GPS_REQUIRED"
                    });
                }

                distance = CalculateDistanceMeters(request.Latitude.Value, request.Longitude.Value, project.Latitude.Value, project.Longitude.Value);
                if (distance.Value > project.AllowedRadiusMeters)
                {
                    return Results.BadRequest(new
                    {
                        message = $"Bạn đang cách dự án {Math.Round(distance.Value)}m (vượt quá bán kính cho phép {project.AllowedRadiusMeters}m). Vui lòng di chuyển vào vị trí dự án để dập thẻ.",
                        code = "GPS_OUT_OF_BOUNDS",
                        distanceMeters = Math.Round(distance.Value),
                        allowedRadiusMeters = project.AllowedRadiusMeters
                    });
                }

                isGpsVerified = true;
            }

            var existing = await db.Attendances
                .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today);

            var isLate = employee.Shift != null && nowTime > TimeOnly.FromTimeSpan(employee.Shift.StartTime.Add(TimeSpan.FromMinutes(15)));
            var status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;

            var defaultDevice = request.IsRemoteLeader == true ? "Kiosk Remote (Đội trưởng ủy quyền từ xa)" : (request.Device ?? "Smartphone PWA");
            var finalNotes = request.IsRemoteLeader == true 
                ? (string.IsNullOrWhiteSpace(request.Notes) ? "[Đội trưởng ủy quyền từ xa]" : $"[Ủy quyền từ xa] {request.Notes}")
                : request.Notes;

            if (existing != null)
            {
                existing.CheckInTime ??= nowTime;
                existing.Status = status;
                existing.CheckInLatitude = request.Latitude;
                existing.CheckInLongitude = request.Longitude;
                existing.DistanceToProjectMeters = distance;
                existing.IsGpsVerified = isGpsVerified;
                existing.CheckInDevice = defaultDevice;
                existing.CheckedInBy = request.CheckedInBy;
                if (!string.IsNullOrWhiteSpace(finalNotes)) existing.Notes = finalNotes;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new Attendance
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = request.EmployeeId,
                    ProjectId = projectId.Value,
                    ShiftId = shiftId.Value,
                    Date = today,
                    CheckInTime = nowTime,
                    Status = status,
                    WorkedHours = employee.Shift?.TotalHours ?? 8.0,
                    OtHours = 0,
                    Notes = finalNotes,
                    CheckInLatitude = request.Latitude,
                    CheckInLongitude = request.Longitude,
                    DistanceToProjectMeters = distance,
                    IsGpsVerified = isGpsVerified,
                    CheckInDevice = defaultDevice,
                    CheckedInBy = request.CheckedInBy,
                    CreatedAt = DateTime.UtcNow
                };
                db.Attendances.Add(existing);
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = isLate ? "Check-in thành công (Ghi nhận Đi muộn)" : "Check-in thành công (Đúng giờ)",
                time = nowTime.ToString("HH:mm:ss"),
                status = existing.Status.ToString().ToUpper(),
                isGpsVerified,
                distanceMeters = distance.HasValue ? Math.Round(distance.Value) : (double?)null
            });
        });

        // 3. Personal Check-Out
        group.MapPost("/check-out", async ([FromBody] CheckOutRequest request, ApplicationDbContext db) =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var nowTime = TimeOnly.FromDateTime(DateTime.Now);

            var existing = await db.Attendances
                .Include(a => a.Shift)
                .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == today);

            if (existing == null)
            {
                return Results.BadRequest(new { message = "Bạn chưa Check-in hôm nay." });
            }

            existing.CheckOutTime = nowTime;
            existing.UpdatedAt = DateTime.UtcNow;

            if (existing.CheckInTime.HasValue)
            {
                var duration = (nowTime.ToTimeSpan() - existing.CheckInTime.Value.ToTimeSpan()).TotalHours;
                existing.WorkedHours = Math.Max(0, Math.Round(duration, 1));

                var standardHours = existing.Shift?.TotalHours ?? 8.0;
                double ot = 0;
                if (existing.Shift != null && nowTime.ToTimeSpan() > existing.Shift.EndTime)
                {
                    ot = (nowTime.ToTimeSpan() - existing.Shift.EndTime).TotalHours;
                }
                else if (existing.WorkedHours > standardHours)
                {
                    ot = existing.WorkedHours - standardHours;
                }
                existing.OtHours = Math.Max(0, Math.Round(ot, 1));
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = "Check-out thành công!",
                time = nowTime.ToString("HH:mm:ss"),
                workedHours = existing.WorkedHours,
                otHours = existing.OtHours
            });
        });

        // 4. Bulk Save Attendance (For HR / Manager)
        group.MapPost("/bulk-save", async ([FromBody] List<BulkAttendanceItem> items, ApplicationDbContext db) =>
        {
            foreach (var item in items)
            {
                if (!DateOnly.TryParse(item.Date, out var date)) continue;

                var existing = await db.Attendances
                    .FirstOrDefaultAsync(a => a.EmployeeId == item.EmployeeId && a.Date == date);

                Enum.TryParse<AttendanceStatus>(item.Status, true, out var parsedStatus);

                TimeOnly? checkIn = null;
                if (!string.IsNullOrWhiteSpace(item.CheckIn) && TimeOnly.TryParse(item.CheckIn, out var cIn))
                    checkIn = cIn;

                TimeOnly? checkOut = null;
                if (!string.IsNullOrWhiteSpace(item.CheckOut) && TimeOnly.TryParse(item.CheckOut, out var cOut))
                    checkOut = cOut;

                if (existing != null)
                {
                    existing.Status = parsedStatus;
                    existing.CheckInTime = checkIn;
                    existing.CheckOutTime = checkOut;
                    existing.WorkedHours = item.WorkedHours;
                    existing.OtHours = item.OtHours;
                    existing.Notes = item.Notes;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var employee = await db.Employees.FindAsync(item.EmployeeId);
                    if (employee?.ProjectId == null || employee?.ShiftId == null) continue;

                    db.Attendances.Add(new Attendance
                    {
                        Id = Guid.NewGuid(),
                        EmployeeId = item.EmployeeId,
                        ProjectId = item.ProjectId ?? employee.ProjectId.Value,
                        ShiftId = item.ShiftId ?? employee.ShiftId.Value,
                        Date = date,
                        CheckInTime = checkIn,
                        CheckOutTime = checkOut,
                        Status = parsedStatus,
                        WorkedHours = item.WorkedHours,
                        OtHours = item.OtHours,
                        Notes = item.Notes,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { message = $"Đã lưu thành công {items.Count} bản ghi chấm công." });
        });

        // 5. Monthly Timesheet Matrix
        group.MapGet("/monthly", async ([FromQuery] int? month, [FromQuery] int? year, ApplicationDbContext db) =>
        {
            var targetMonth = month ?? DateTime.UtcNow.Month;
            var targetYear = year ?? DateTime.UtcNow.Year;

            var startDate = new DateOnly(targetYear, targetMonth, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var employees = await db.Employees
                .Include(e => e.Project)
                .OrderBy(e => e.Code)
                .ToListAsync();

            var records = await db.Attendances
                .Where(a => a.Date >= startDate && a.Date <= endDate)
                .ToListAsync();

            var matrix = employees.Select(emp =>
            {
                var empRecords = records.Where(r => r.EmployeeId == emp.Id).ToList();

                var totalWorkedDays = empRecords.Count(r => r.Status == AttendanceStatus.Present || r.Status == AttendanceStatus.Late);
                var totalOtHours = empRecords.Sum(r => r.OtHours);
                var totalLateCount = empRecords.Count(r => r.Status == AttendanceStatus.Late);
                var totalLeaveDays = empRecords.Count(r => r.Status == AttendanceStatus.Leave);

                var dailyStatuses = empRecords.ToDictionary(
                    r => r.Date.Day,
                    r => new
                    {
                        Status = r.Status.ToString().ToUpper(),
                        CheckIn = r.CheckInTime?.ToString("HH:mm"),
                        CheckOut = r.CheckOutTime?.ToString("HH:mm"),
                        r.WorkedHours,
                        r.OtHours
                    }
                );

                return new
                {
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.Code,
                    EmployeeName = emp.FullName,
                    Department = emp.Department,
                    ProjectCode = emp.Project?.Code,
                    DailyStatuses = dailyStatuses,
                    TotalWorkedDays = totalWorkedDays,
                    TotalOtHours = totalOtHours,
                    TotalLateCount = totalLateCount,
                    TotalLeaveDays = totalLeaveDays
                };
            });

            return Results.Ok(new
            {
                Month = targetMonth,
                Year = targetYear,
                DaysInMonth = endDate.Day,
                Data = matrix
            });
        });

        // 6. Client Error Logging Endpoint (For Telemetry & Auto-Update monitoring)
        app.MapPost("/api/logs/client-error", ([FromBody] ClientErrorLogRequest request) =>
        {
            Serilog.Log.ForContext("ClientDevice", request.Device)
                .ForContext("ErrorType", request.ErrorType)
                .ForContext("Path", request.Path)
                .Error("[CLIENT_TELEMETRY] [{ErrorType}] at {Path} (Device: {Device}): {Message} | Details: {Details}",
                    request.ErrorType, request.Path ?? "/", request.Device, request.Message, request.Details ?? "None");

            return Results.Ok(new { success = true, receivedAt = DateTime.UtcNow });
        }).WithTags("Logs");

        // 7. Makeup Attendance for Past Days (Chấm công bù)
        group.MapPost("/makeup", async ([FromBody] MakeupAttendanceRequest request, ApplicationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Date) || !DateOnly.TryParse(request.Date, out var date))
            {
                return Results.BadRequest(new { message = "Ngày chấm công bù không hợp lệ." });
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (date > today)
            {
                return Results.BadRequest(new { message = "Không thể chấm công bù cho ngày tương lai." });
            }

            if (string.IsNullOrWhiteSpace(request.CheckIn) || !TimeOnly.TryParse(request.CheckIn, out var checkInTime))
            {
                return Results.BadRequest(new { message = "Giờ vào (Check-in) không hợp lệ." });
            }

            TimeOnly? checkOutTime = null;
            if (!string.IsNullOrWhiteSpace(request.CheckOut) && TimeOnly.TryParse(request.CheckOut, out var parsedCheckOut))
            {
                checkOutTime = parsedCheckOut;
                if (checkOutTime.Value <= checkInTime)
                {
                    return Results.BadRequest(new { message = "Giờ ra (Check-out) phải sau giờ vào." });
                }
            }

            var employee = await db.Employees
                .Include(e => e.Shift)
                .FirstOrDefaultAsync(e => e.Id == request.EmployeeId);

            if (employee == null)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            var shiftId = request.ShiftId ?? employee.ShiftId;
            var shift = shiftId.HasValue ? await db.Shifts.FindAsync(shiftId.Value) : employee.Shift;
            var standardHours = shift?.TotalHours ?? 8.0;

            double workedHours = 0;
            double otHours = 0;

            if (checkOutTime.HasValue)
            {
                var duration = (checkOutTime.Value.ToTimeSpan() - checkInTime.ToTimeSpan()).TotalHours;
                workedHours = Math.Max(0, Math.Round(duration, 1));
                
                double ot = 0;
                if (shift != null && checkOutTime.Value.ToTimeSpan() > shift.EndTime)
                {
                    ot = (checkOutTime.Value.ToTimeSpan() - shift.EndTime).TotalHours;
                }
                else if (workedHours > standardHours)
                {
                    ot = workedHours - standardHours;
                }
                otHours = Math.Max(0, Math.Round(ot, 1));
            }
            else
            {
                workedHours = standardHours;
            }

            var isLate = shift != null && checkInTime > TimeOnly.FromTimeSpan(shift.StartTime.Add(TimeSpan.FromMinutes(15)));
            var status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;

            var projectId = employee.ProjectId ?? (await db.Projects.Select(p => p.Id).FirstOrDefaultAsync());

            var existing = await db.Attendances
                .FirstOrDefaultAsync(a => a.EmployeeId == request.EmployeeId && a.Date == date);

            var noteText = $"[Chấm công bù] {request.Reason?.Trim()}";

            if (existing != null)
            {
                existing.CheckInTime = checkInTime;
                existing.CheckOutTime = checkOutTime;
                existing.Status = status;
                existing.WorkedHours = workedHours;
                existing.OtHours = otHours;
                existing.Notes = noteText;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new Attendance
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = request.EmployeeId,
                    ProjectId = projectId,
                    ShiftId = shiftId ?? Guid.Empty,
                    Date = date,
                    CheckInTime = checkInTime,
                    CheckOutTime = checkOutTime,
                    Status = status,
                    WorkedHours = workedHours,
                    OtHours = otHours,
                    Notes = noteText,
                    CheckInDevice = "Portal Admin (Chấm công bù)",
                    IsGpsVerified = true,
                    CreatedAt = DateTime.UtcNow
                };
                db.Attendances.Add(existing);
            }

            await db.SaveChangesAsync();

            Serilog.Log.Information("[MAKEUP_ATTENDANCE] Chấm công bù thành công cho {Emp} ngày {Date}: {Reason} ({Worked}h, OT: {Ot}h)",
                employee.FullName, request.Date, request.Reason, workedHours, otHours);

            return Results.Ok(new
            {
                message = $"Chấm công bù ngày {request.Date} thành công!",
                workedHours,
                otHours,
                status = status.ToString().ToUpper(),
                recordId = existing.Id
            });
        });

        // 8. Bulk Makeup Attendance (Chấm công bù hàng loạt)
        group.MapPost("/bulk-makeup", async ([FromBody] BulkMakeupAttendanceRequest request, ApplicationDbContext db) =>
        {
            if (request.EmployeeIds == null || request.EmployeeIds.Count == 0)
            {
                return Results.BadRequest(new { message = "Danh sách nhân viên không được rỗng." });
            }

            if (string.IsNullOrWhiteSpace(request.Date) || !DateOnly.TryParse(request.Date, out var date))
            {
                return Results.BadRequest(new { message = "Ngày chấm công bù không hợp lệ." });
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (date > today)
            {
                return Results.BadRequest(new { message = "Không thể chấm công bù cho ngày tương lai." });
            }

            if (string.IsNullOrWhiteSpace(request.CheckIn) || !TimeOnly.TryParse(request.CheckIn, out var checkInTime))
            {
                return Results.BadRequest(new { message = "Giờ vào (Check-in) không hợp lệ." });
            }

            TimeOnly? checkOutTime = null;
            if (!string.IsNullOrWhiteSpace(request.CheckOut) && TimeOnly.TryParse(request.CheckOut, out var parsedCheckOut))
            {
                checkOutTime = parsedCheckOut;
                if (checkOutTime.Value <= checkInTime)
                {
                    return Results.BadRequest(new { message = "Giờ ra (Check-out) phải sau giờ vào." });
                }
            }

            var employees = await db.Employees
                .Include(e => e.Shift)
                .Where(e => request.EmployeeIds.Contains(e.Id))
                .ToListAsync();

            if (employees.Count == 0)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên nào phù hợp." });
            }

            var defaultProjectId = await db.Projects.Select(p => p.Id).FirstOrDefaultAsync();
            int successCount = 0;
            var noteText = $"[Chấm công bù hàng loạt] {request.Reason?.Trim()}";

            foreach (var emp in employees)
            {
                var shiftId = request.ShiftId ?? emp.ShiftId;
                var shift = shiftId.HasValue ? await db.Shifts.FindAsync(shiftId.Value) : emp.Shift;
                var standardHours = shift?.TotalHours ?? 8.0;

                double workedHours = 0;
                double otHours = 0;

                if (checkOutTime.HasValue)
                {
                    var duration = (checkOutTime.Value.ToTimeSpan() - checkInTime.ToTimeSpan()).TotalHours;
                    workedHours = Math.Max(0, Math.Round(duration, 1));

                    double ot = 0;
                    if (shift != null && checkOutTime.Value.ToTimeSpan() > shift.EndTime)
                    {
                        ot = (checkOutTime.Value.ToTimeSpan() - shift.EndTime).TotalHours;
                    }
                    else if (workedHours > standardHours)
                    {
                        ot = workedHours - standardHours;
                    }
                    otHours = Math.Max(0, Math.Round(ot, 1));
                }
                else
                {
                    workedHours = standardHours;
                }

                var isLate = shift != null && checkInTime > TimeOnly.FromTimeSpan(shift.StartTime.Add(TimeSpan.FromMinutes(15)));
                var status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;
                var projectId = emp.ProjectId ?? defaultProjectId;

                var existing = await db.Attendances
                    .FirstOrDefaultAsync(a => a.EmployeeId == emp.Id && a.Date == date);

                if (existing != null)
                {
                    existing.CheckInTime = checkInTime;
                    existing.CheckOutTime = checkOutTime;
                    existing.Status = status;
                    existing.WorkedHours = workedHours;
                    existing.OtHours = otHours;
                    existing.Notes = noteText;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    existing = new Attendance
                    {
                        Id = Guid.NewGuid(),
                        EmployeeId = emp.Id,
                        ProjectId = projectId,
                        ShiftId = shiftId ?? Guid.Empty,
                        Date = date,
                        CheckInTime = checkInTime,
                        CheckOutTime = checkOutTime,
                        Status = status,
                        WorkedHours = workedHours,
                        OtHours = otHours,
                        Notes = noteText,
                        CheckInDevice = "Portal Admin (Chấm bù hàng loạt)",
                        IsGpsVerified = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    db.Attendances.Add(existing);
                }

                successCount++;
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[BULK_MAKEUP_ATTENDANCE] Chấm công bù thành công cho {Count} nhân viên ngày {Date}", successCount, request.Date);

            return Results.Ok(new
            {
                message = $"Đã chấm công bù thành công cho {successCount} nhân viên ngày {request.Date}!",
                successCount
            });
        });
    }

    /// <summary>
    /// Calculates distance between two coordinates in meters using the Haversine formula
    /// </summary>
    public static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // Radius of the Earth in meters
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRadians(double degrees) => degrees * (Math.PI / 180.0);
}

public record CheckInRequest(
    Guid EmployeeId,
    Guid? ProjectId,
    string? Notes,
    double? Latitude = null,
    double? Longitude = null,
    double? AccuracyMeters = null,
    string? Device = null,
    Guid? CheckedInBy = null,
    bool? IsRemoteLeader = false
);

public record CheckOutRequest(Guid EmployeeId);

public record BulkAttendanceItem(
    Guid EmployeeId,
    Guid? ProjectId,
    Guid? ShiftId,
    string Date,
    string? CheckIn,
    string? CheckOut,
    string Status,
    double WorkedHours,
    double OtHours,
    string? Notes
);

public record MakeupAttendanceRequest(
    Guid EmployeeId,
    string Date,
    string CheckIn,
    string? CheckOut,
    Guid? ShiftId,
    string Reason
);

public record BulkMakeupAttendanceRequest(
    List<Guid> EmployeeIds,
    string Date,
    string CheckIn,
    string? CheckOut,
    Guid? ShiftId,
    string Reason
);

public record ClientErrorLogRequest(
    string Device,
    string ErrorType,
    string Message,
    string? Details,
    string? Path,
    DateTime? Timestamp
);
