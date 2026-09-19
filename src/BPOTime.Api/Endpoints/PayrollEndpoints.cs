using BPOTime.Application.Payroll;
using BPOTime.Domain.Entities;
using BPOTime.Domain.Enums;
using BPOTime.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BPOTime.Api.Endpoints;

public static class PayrollEndpoints
{
    public static void MapPayrollEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/payroll").WithTags("Payroll");

        // 1. Get Payroll Settings
        group.MapGet("/settings", async (ApplicationDbContext db) =>
        {
            var setting = await db.PayrollSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new PayrollSetting();
                db.PayrollSettings.Add(setting);
                await db.SaveChangesAsync();
            }
            return Results.Ok(setting);
        });

        // 2. Update Payroll Settings
        group.MapPut("/settings", async ([FromBody] PayrollSetting update, ApplicationDbContext db) =>
        {
            var setting = await db.PayrollSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new PayrollSetting();
                db.PayrollSettings.Add(setting);
            }

            setting.StandardHoursPerDay = update.StandardHoursPerDay;
            setting.StandardWorkDaysPerMonth = update.StandardWorkDaysPerMonth;
            setting.OtNormalDayMultiplier = update.OtNormalDayMultiplier;
            setting.OtWeekendMultiplier = update.OtWeekendMultiplier;
            setting.OtHolidayMultiplier = update.OtHolidayMultiplier;
            setting.SocialInsuranceEmployeeRate = update.SocialInsuranceEmployeeRate;
            setting.SocialInsuranceEmployerRate = update.SocialInsuranceEmployerRate;
            setting.RoundingPrecision = update.RoundingPrecision;
            setting.Currency = update.Currency ?? "VND";
            setting.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(setting);
        });

        // 3. Preview Payroll Calculation for Period (e.g. "2026-09")
        group.MapGet("/{period}/preview", async (
            string period, 
            ApplicationDbContext db,
            IPayrollCalculationService calcService) =>
        {
            if (!TryParsePeriod(period, out int year, out int month))
            {
                return Results.BadRequest(new { message = "Định dạng kỳ lương không hợp lệ. Chuẩn: YYYY-MM (Ví dụ: 2026-09)" });
            }

            var (employees, policies, setting, attendances) = await LoadPayrollDataAsync(db, year, month);

            var preview = calcService.CalculatePeriod(month, year, employees, policies, setting, attendances);

            // Check if period was already created/locked in DB
            var existingPeriod = await db.PayrollPeriods.FirstOrDefaultAsync(p => p.PeriodCode == period);
            if (existingPeriod != null)
            {
                preview.Status = existingPeriod.Status;
            }

            return Results.Ok(preview);
        });

        // 4. Calculate & Save Payroll Snapshot (Blocked if LOCKED)
        group.MapPost("/{period}/calculate", async (
            string period,
            ApplicationDbContext db,
            IPayrollCalculationService calcService) =>
        {
            if (!TryParsePeriod(period, out int year, out int month))
            {
                return Results.BadRequest(new { message = "Định dạng kỳ lương không hợp lệ (YYYY-MM)." });
            }

            var existingPeriod = await db.PayrollPeriods
                .Include(p => p.Records)
                .FirstOrDefaultAsync(p => p.PeriodCode == period);

            if (existingPeriod != null && existingPeriod.Status == PayrollPeriodStatus.Locked)
            {
                return Results.BadRequest(new { message = $"Kỳ lương {period} đã bị KHÓA VĨNH VIỄN (LOCKED). Không thể tính toán lại." });
            }

            var (employees, policies, setting, attendances) = await LoadPayrollDataAsync(db, year, month);

            // Validate that all employees have a salary policy
            var unconfigured = employees.Where(e => !policies.Any(p => p.EmployeeId == e.Id && p.IsActive)).ToList();
            if (unconfigured.Count > 0)
            {
                return Results.BadRequest(new
                {
                    message = $"Có {unconfigured.Count} nhân viên chưa được thiết lập phương thức tính lương. Vui lòng cấu hình trước khi chốt tính lương.",
                    unconfiguredEmployees = unconfigured.Select(e => new { e.Id, e.Code, e.FullName })
                });
            }

            var preview = calcService.CalculatePeriod(month, year, employees, policies, setting, attendances);

            if (existingPeriod == null)
            {
                existingPeriod = new PayrollPeriod
                {
                    Id = Guid.NewGuid(),
                    Month = month,
                    Year = year,
                    PeriodCode = period,
                    Status = PayrollPeriodStatus.Calculated,
                    CalculatedAt = DateTime.UtcNow
                };
                db.PayrollPeriods.Add(existingPeriod);
            }
            else
            {
                existingPeriod.Status = PayrollPeriodStatus.Calculated;
                existingPeriod.CalculatedAt = DateTime.UtcNow;
                db.PayrollRecords.RemoveRange(existingPeriod.Records);
            }

            existingPeriod.TotalGrossPay = preview.TotalGrossPay;
            existingPeriod.TotalNetPay = preview.TotalNetPay;
            existingPeriod.TotalEmployees = preview.TotalEmployees;

            foreach (var item in preview.Items)
            {
                var record = new PayrollRecord
                {
                    Id = Guid.NewGuid(),
                    PayrollPeriodId = existingPeriod.Id,
                    EmployeeId = item.EmployeeId,
                    SalaryPolicyId = item.SalaryPolicyId,
                    SalaryType = item.SalaryType,
                    RateUnit = item.RateUnit,
                    StandardHoursPerDay = item.StandardHoursPerDay,
                    StandardWorkDaysPerMonth = item.StandardWorkDaysPerMonth,
                    WorkedHours = item.WorkedHours,
                    AttendanceUnits = item.AttendanceUnits,
                    ValidWorkDays = item.ValidWorkDays,
                    BasePay = item.BasePay,
                    OtHours = item.OtHours,
                    OtBaseHourlyRate = item.OtBaseHourlyRate,
                    OtPay = item.OtPay,
                    Bonus = item.Bonus,
                    Allowance = item.Allowance,
                    Advance = item.Advance,
                    Deduction = item.Deduction,
                    InsuranceDeduction = item.InsuranceDeduction,
                    GrossPay = item.GrossPay,
                    NetPay = item.NetPay,
                    IsAnomaly = item.IsAnomaly,
                    AnomalyReason = item.AnomalyReason,
                    BreakdownJson = item.BreakdownJson,
                    CreatedAt = DateTime.UtcNow
                };
                existingPeriod.Records.Add(record);
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[PAYROLL_CALCULATED] Đã tính toán và lưu snapshot kỳ lương {Period}: {EmpCount} nhân sự, Net: {Net:N0} đ", 
                period, existingPeriod.TotalEmployees, existingPeriod.TotalNetPay);

            return Results.Ok(new
            {
                message = $"Đã tính toán và lưu snapshot kỳ lương {period} thành công!",
                preview
            });
        });

        // 5. Get Breakdown for a specific Employee in Period
        group.MapGet("/{period}/{employeeId:guid}/breakdown", async (
            string period,
            Guid employeeId,
            ApplicationDbContext db,
            IPayrollCalculationService calcService) =>
        {
            if (!TryParsePeriod(period, out int year, out int month))
            {
                return Results.BadRequest(new { message = "Định dạng kỳ lương không hợp lệ." });
            }

            var record = await db.PayrollRecords
                .Include(r => r.Employee)
                .Include(r => r.PayrollPeriod)
                .FirstOrDefaultAsync(r => r.PayrollPeriod.PeriodCode == period && r.EmployeeId == employeeId);

            if (record != null)
            {
                return Results.Ok(new
                {
                    EmployeeId = record.EmployeeId,
                    EmployeeCode = record.Employee.Code,
                    EmployeeName = record.Employee.FullName,
                    Department = record.Employee.Department,
                    SalaryType = record.SalaryType.ToString(),
                    RateUnit = record.RateUnit,
                    record.WorkedHours,
                    record.AttendanceUnits,
                    record.ValidWorkDays,
                    record.BasePay,
                    record.OtHours,
                    record.OtBaseHourlyRate,
                    record.OtPay,
                    record.Bonus,
                    record.Allowance,
                    record.Advance,
                    record.Deduction,
                    record.InsuranceDeduction,
                    record.GrossPay,
                    record.NetPay,
                    record.IsAnomaly,
                    record.AnomalyReason,
                    BreakdownJson = record.BreakdownJson
                });
            }

            // If not calculated into DB yet, compute on the fly
            var employee = await db.Employees.Include(e => e.Project).FirstOrDefaultAsync(e => e.Id == employeeId);
            if (employee == null) return Results.NotFound(new { message = "Không tìm thấy nhân viên." });

            var (employees, policies, setting, attendances) = await LoadPayrollDataAsync(db, year, month);
            var empPolicy = policies.Where(p => p.EmployeeId == employeeId && p.IsActive).OrderByDescending(p => p.EffectiveFrom).FirstOrDefault();
            var empAttendances = attendances.Where(a => a.EmployeeId == employeeId).ToList();

            var daysInMonth = DateTime.DaysInMonth(year, month);
            var liveCalc = calcService.CalculateEmployee(employee, empPolicy, setting, empAttendances, daysInMonth);

            return Results.Ok(liveCalc);
        });

        // 6. Approve Payroll Period
        group.MapPost("/{period}/approve", async (string period, ApplicationDbContext db) =>
        {
            var p = await db.PayrollPeriods.FirstOrDefaultAsync(x => x.PeriodCode == period);
            if (p == null)
            {
                return Results.NotFound(new { message = $"Chưa tính toán kỳ lương {period}." });
            }

            if (p.Status == PayrollPeriodStatus.Locked)
            {
                return Results.BadRequest(new { message = "Kỳ lương đã bị khóa sổ." });
            }

            p.Status = PayrollPeriodStatus.Approved;
            p.ApprovedAt = DateTime.UtcNow;
            p.ApprovedBy = "Ban Giám Đốc";

            await db.SaveChangesAsync();
            Serilog.Log.Information("[PAYROLL_APPROVED] Phê duyệt kỳ lương {Period}", period);

            return Results.Ok(new { message = $"Đã phê duyệt kỳ lương {period} thành công!" });
        });

        // 7. Lock Payroll Period Permanently
        group.MapPost("/{period}/lock", async (string period, ApplicationDbContext db) =>
        {
            var p = await db.PayrollPeriods.FirstOrDefaultAsync(x => x.PeriodCode == period);
            if (p == null)
            {
                return Results.NotFound(new { message = $"Chưa tính toán kỳ lương {period}." });
            }

            p.Status = PayrollPeriodStatus.Locked;
            p.LockedAt = DateTime.UtcNow;
            p.LockedBy = "Hệ thống Quản trị / Kế toán trưởng";

            await db.SaveChangesAsync();
            Serilog.Log.Information("[PAYROLL_LOCKED] Khóa sổ vĩnh viễn kỳ lương {Period}", period);

            return Results.Ok(new { message = $"Đã KHÓA SỔ VĨNH VIỄN kỳ lương {period}. Toàn bộ bảng công và dữ liệu lương đã được đóng băng chống sửa đổi." });
        });

        // 8. Stats for Dashboard (Counts by Salary Type)
        group.MapGet("/stats", async (ApplicationDbContext db) =>
        {
            var activePolicies = await db.SalaryPolicies
                .Where(p => p.IsActive)
                .GroupBy(p => p.EmployeeId)
                .Select(g => g.OrderByDescending(x => x.EffectiveFrom).First())
                .ToListAsync();

            var totalEmployees = await db.Employees.CountAsync(e => e.Status == EmployeeStatus.Active);

            var hourly = activePolicies.Count(p => p.SalaryType == SalaryType.Hourly);
            var dailyAttendance = activePolicies.Count(p => p.SalaryType == SalaryType.DailyAttendance);
            var dailyCalendar = activePolicies.Count(p => p.SalaryType == SalaryType.DailyCalendar);
            var monthly = activePolicies.Count(p => p.SalaryType == SalaryType.Monthly);
            var unconfigured = Math.Max(0, totalEmployees - activePolicies.Count);

            return Results.Ok(new
            {
                TotalEmployees = totalEmployees,
                Hourly = hourly,
                DailyAttendance = dailyAttendance,
                DailyCalendar = dailyCalendar,
                Monthly = monthly,
                Unconfigured = unconfigured
            });
        });
    }

    private static bool TryParsePeriod(string period, out int year, out int month)
    {
        year = 0;
        month = 0;
        if (string.IsNullOrWhiteSpace(period)) return false;
        var parts = period.Trim().Split('-');
        if (parts.Length != 2) return false;
        return int.TryParse(parts[0], out year) && int.TryParse(parts[1], out month) && month >= 1 && month <= 12;
    }

    private static async Task<(List<Employee>, List<SalaryPolicy>, PayrollSetting, List<Attendance>)> LoadPayrollDataAsync(
        ApplicationDbContext db, int year, int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var startDate = new DateOnly(year, month, 1);
        var endDate = new DateOnly(year, month, daysInMonth);

        // Preload all needed data in batch to avoid N+1 queries
        var employees = await db.Employees
            .AsNoTracking()
            .Include(e => e.Project)
            .Include(e => e.Shift)
            .OrderBy(e => e.Code)
            .ToListAsync();

        var policies = await db.SalaryPolicies
            .AsNoTracking()
            .Where(p => p.IsActive)
            .ToListAsync();

        var setting = await db.PayrollSettings.AsNoTracking().FirstOrDefaultAsync() ?? new PayrollSetting();

        var attendances = await db.Attendances
            .AsNoTracking()
            .Where(a => a.Date >= startDate && a.Date <= endDate)
            .ToListAsync();

        return (employees, policies, setting, attendances);
    }
}
