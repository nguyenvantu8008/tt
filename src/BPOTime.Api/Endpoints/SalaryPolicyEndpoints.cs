using BPOTime.Domain.Entities;
using BPOTime.Domain.Enums;
using BPOTime.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BPOTime.Api.Endpoints;

public static class SalaryPolicyEndpoints
{
    public static void MapSalaryPolicyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api").WithTags("SalaryPolicies");

        // 1. Get active Salary Policy for an Employee
        group.MapGet("/employees/{employeeId:guid}/salary-policy", async (Guid employeeId, ApplicationDbContext db) =>
        {
            var policy = await db.SalaryPolicies
                .Where(p => p.EmployeeId == employeeId && p.IsActive)
                .OrderByDescending(p => p.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (policy == null)
            {
                return Results.Ok(new
                {
                    HasPolicy = false,
                    Message = "Nhân viên chưa được cấu hình phương thức tính lương."
                });
            }

            return Results.Ok(new
            {
                HasPolicy = true,
                Policy = new
                {
                    policy.Id,
                    policy.EmployeeId,
                    SalaryType = policy.SalaryType.ToString(),
                    SalaryTypeName = GetSalaryTypeName(policy.SalaryType),
                    Rate = policy.GetPrimaryRate(),
                    policy.HourlyRate,
                    policy.DailyAttendanceRate,
                    policy.DailyCalendarRate,
                    policy.MonthlySalary,
                    policy.StandardHoursPerDay,
                    policy.StandardWorkDaysPerMonth,
                    ProrationMethod = policy.ProrationMethod.ToString(),
                    policy.EffectiveFrom,
                    policy.EffectiveTo,
                    policy.IsActive,
                    policy.Note,
                    policy.CreatedAt,
                    policy.UpdatedAt
                }
            });
        });

        // 2. Create or Update Salary Policy for an Employee (Preserves History!)
        group.MapPost("/employees/{employeeId:guid}/salary-policy", async (
            Guid employeeId,
            [FromBody] SaveSalaryPolicyRequest request,
            ApplicationDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(employeeId);
            if (employee == null)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            if (!Enum.TryParse<SalaryType>(request.SalaryType, true, out var parsedSalaryType))
            {
                return Results.BadRequest(new { message = "Phương thức tính lương không hợp lệ (HOURLY, DAILY_ATTENDANCE, DAILY_CALENDAR, MONTHLY)." });
            }

            var effectiveFrom = request.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow);

            // Close out previous active policy by setting its EffectiveTo = effectiveFrom - 1 day
            var previousPolicies = await db.SalaryPolicies
                .Where(p => p.EmployeeId == employeeId && p.IsActive && (p.EffectiveTo == null || p.EffectiveTo >= effectiveFrom))
                .ToListAsync();

            foreach (var prev in previousPolicies)
            {
                if (prev.EffectiveFrom >= effectiveFrom)
                {
                    prev.IsActive = false;
                }
                else
                {
                    prev.EffectiveTo = effectiveFrom.AddDays(-1);
                    prev.UpdatedAt = DateTime.UtcNow;
                }
            }

            Enum.TryParse<MonthlyProrationMethod>(request.ProrationMethod, true, out var parsedProration);

            var newPolicy = new SalaryPolicy
            {
                Id = Guid.NewGuid(),
                EmployeeId = employeeId,
                SalaryType = parsedSalaryType,
                HourlyRate = parsedSalaryType == SalaryType.Hourly ? request.Rate : null,
                DailyAttendanceRate = parsedSalaryType == SalaryType.DailyAttendance ? request.Rate : null,
                DailyCalendarRate = parsedSalaryType == SalaryType.DailyCalendar ? request.Rate : null,
                MonthlySalary = parsedSalaryType == SalaryType.Monthly ? request.Rate : null,
                StandardHoursPerDay = request.StandardHoursPerDay > 0 ? request.StandardHoursPerDay : 8.0,
                StandardWorkDaysPerMonth = request.StandardWorkDaysPerMonth > 0 ? request.StandardWorkDaysPerMonth : 26.0,
                ProrationMethod = parsedProration != 0 ? parsedProration : MonthlyProrationMethod.StandardWorkDays,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = request.EffectiveTo,
                IsActive = true,
                Note = request.Note?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            db.SalaryPolicies.Add(newPolicy);
            await db.SaveChangesAsync();

            Serilog.Log.Information("[SALARY_POLICY_CREATED] Nhân viên {Code} áp dụng {Type} mức {Rate:N0} từ {From}", 
                employee.Code, newPolicy.SalaryType, newPolicy.GetPrimaryRate(), newPolicy.EffectiveFrom);

            return Results.Ok(new
            {
                message = "Cập nhật chính sách lương thành công!",
                policyId = newPolicy.Id
            });
        });

        // 3. Get Salary History of an Employee
        group.MapGet("/employees/{employeeId:guid}/salary-history", async (Guid employeeId, ApplicationDbContext db) =>
        {
            var history = await db.SalaryPolicies
                .Where(p => p.EmployeeId == employeeId)
                .OrderByDescending(p => p.EffectiveFrom)
                .ThenByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    SalaryType = p.SalaryType.ToString(),
                    SalaryTypeName = p.SalaryType == SalaryType.Hourly ? "Theo giờ" :
                                     p.SalaryType == SalaryType.DailyAttendance ? "Theo công" :
                                     p.SalaryType == SalaryType.DailyCalendar ? "Theo ngày" : "Theo tháng",
                    Rate = p.SalaryType == SalaryType.Hourly ? p.HourlyRate :
                           p.SalaryType == SalaryType.DailyAttendance ? p.DailyAttendanceRate :
                           p.SalaryType == SalaryType.DailyCalendar ? p.DailyCalendarRate : p.MonthlySalary,
                    p.StandardHoursPerDay,
                    p.StandardWorkDaysPerMonth,
                    ProrationMethod = p.ProrationMethod.ToString(),
                    p.EffectiveFrom,
                    p.EffectiveTo,
                    p.IsActive,
                    p.Note,
                    p.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(history);
        });

        // 4. Bulk Set Salary Policy
        group.MapPost("/salary-policies/bulk", async ([FromBody] BulkSalaryPolicyRequest request, ApplicationDbContext db) =>
        {
            if (request.EmployeeIds == null || request.EmployeeIds.Count == 0)
            {
                return Results.BadRequest(new { message = "Chưa chọn nhân viên nào để thiết lập lương." });
            }

            if (!Enum.TryParse<SalaryType>(request.SalaryType, true, out var parsedSalaryType))
            {
                return Results.BadRequest(new { message = "Phương thức tính lương không hợp lệ." });
            }

            if (request.Rate <= 0)
            {
                return Results.BadRequest(new { message = "Mức lương phải lớn hơn 0 VNĐ." });
            }

            var effectiveFrom = request.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow);
            int updatedCount = 0;

            foreach (var empId in request.EmployeeIds)
            {
                var employee = await db.Employees.FindAsync(empId);
                if (employee == null) continue;

                // Close previous active policies
                var previousPolicies = await db.SalaryPolicies
                    .Where(p => p.EmployeeId == empId && p.IsActive && (p.EffectiveTo == null || p.EffectiveTo >= effectiveFrom))
                    .ToListAsync();

                foreach (var prev in previousPolicies)
                {
                    if (prev.EffectiveFrom >= effectiveFrom)
                    {
                        prev.IsActive = false;
                    }
                    else
                    {
                        prev.EffectiveTo = effectiveFrom.AddDays(-1);
                        prev.UpdatedAt = DateTime.UtcNow;
                    }
                }

                var newPolicy = new SalaryPolicy
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = empId,
                    SalaryType = parsedSalaryType,
                    HourlyRate = parsedSalaryType == SalaryType.Hourly ? request.Rate : null,
                    DailyAttendanceRate = parsedSalaryType == SalaryType.DailyAttendance ? request.Rate : null,
                    DailyCalendarRate = parsedSalaryType == SalaryType.DailyCalendar ? request.Rate : null,
                    MonthlySalary = parsedSalaryType == SalaryType.Monthly ? request.Rate : null,
                    StandardHoursPerDay = request.StandardHoursPerDay > 0 ? request.StandardHoursPerDay : 8.0,
                    StandardWorkDaysPerMonth = request.StandardWorkDaysPerMonth > 0 ? request.StandardWorkDaysPerMonth : 26.0,
                    ProrationMethod = MonthlyProrationMethod.StandardWorkDays,
                    EffectiveFrom = effectiveFrom,
                    EffectiveTo = null,
                    IsActive = true,
                    Note = request.Note?.Trim() ?? "Thiết lập lương hàng loạt",
                    CreatedAt = DateTime.UtcNow
                };

                db.SalaryPolicies.Add(newPolicy);
                updatedCount++;
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[SALARY_POLICY_BULK] Thiết lập hàng loạt {Count} nhân sự theo {Type} mức {Rate:N0}", 
                updatedCount, parsedSalaryType, request.Rate);

            return Results.Ok(new
            {
                message = $"Đã thiết lập chính sách lương thành công cho {updatedCount} nhân viên!",
                updatedCount
            });
        });
    }

    private static string GetSalaryTypeName(SalaryType type) => type switch
    {
        SalaryType.Hourly => "Theo giờ",
        SalaryType.DailyAttendance => "Theo công",
        SalaryType.DailyCalendar => "Theo ngày",
        SalaryType.Monthly => "Theo tháng",
        _ => "Chưa xác định"
    };
}

public record SaveSalaryPolicyRequest(
    string SalaryType,
    decimal Rate,
    double StandardHoursPerDay = 8.0,
    double StandardWorkDaysPerMonth = 26.0,
    string? ProrationMethod = "StandardWorkDays",
    DateOnly? EffectiveFrom = null,
    DateOnly? EffectiveTo = null,
    string? Note = null
);

public record BulkSalaryPolicyRequest(
    List<Guid> EmployeeIds,
    string SalaryType,
    decimal Rate,
    double StandardHoursPerDay = 8.0,
    double StandardWorkDaysPerMonth = 26.0,
    DateOnly? EffectiveFrom = null,
    string? Note = null
);
