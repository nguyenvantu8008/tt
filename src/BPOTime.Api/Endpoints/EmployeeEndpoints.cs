using BPOTime.Domain.Entities;
using BPOTime.Domain.Enums;
using BPOTime.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BPOTime.Api.Endpoints;

public static class EmployeeEndpoints
{
    public static void MapEmployeeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/employees").WithTags("Employees");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            var employees = await db.Employees
                .Include(e => e.Project)
                .Include(e => e.Shift)
                .OrderBy(e => e.Code)
                .Select(e => new
                {
                    e.Id,
                    e.Code,
                    e.FullName,
                    e.Email,
                    e.Phone,
                    e.Department,
                    e.Position,
                    e.Avatar,
                    e.JoinDate,
                    Status = e.Status.ToString().ToUpper(),
                    ProjectId = e.ProjectId,
                    ProjectCode = e.Project != null ? e.Project.Code : null,
                    ProjectColor = e.Project != null ? e.Project.Color : null,
                    ShiftId = e.ShiftId,
                    ShiftName = e.Shift != null ? e.Shift.Name : null,
                    ShiftCode = e.Shift != null ? e.Shift.Code : null
                })
                .ToListAsync();

            return Results.Ok(employees);
        });

        group.MapPost("/", async ([FromBody] CreateEmployeeRequest request, ApplicationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Code))
            {
                return Results.BadRequest(new { message = "Họ tên và mã nhân viên là bắt buộc." });
            }

            var exists = await db.Employees.AnyAsync(e => e.Code.ToLower() == request.Code.Trim().ToLower());
            if (exists)
            {
                return Results.Conflict(new { message = $"Mã nhân viên {request.Code} đã tồn tại." });
            }

            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                Code = request.Code.Trim().ToUpper(),
                FullName = request.FullName.Trim(),
                Email = request.Email?.Trim(),
                Phone = request.Phone?.Trim(),
                Department = request.Department?.Trim() ?? "CSKH & Hotline",
                Position = request.Position?.Trim() ?? "Chuyên viên",
                Avatar = string.IsNullOrWhiteSpace(request.Avatar) 
                    ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" 
                    : request.Avatar.Trim(),
                JoinDate = DateTime.SpecifyKind(request.JoinDate ?? DateTime.UtcNow, DateTimeKind.Utc),
                Status = EmployeeStatus.Active,
                ProjectId = request.ProjectId,
                ShiftId = request.ShiftId
            };

            db.Employees.Add(employee);
            await db.SaveChangesAsync();

            Serilog.Log.Information("[EMPLOYEE_CREATED] Tạo mới nhân viên {Code} - {Name}", employee.Code, employee.FullName);
            return Results.Created($"/api/employees/{employee.Id}", employee);
        });

        // 3. Update Employee
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateEmployeeRequest request, ApplicationDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            if (!string.IsNullOrWhiteSpace(request.FullName))
                employee.FullName = request.FullName.Trim();

            if (!string.IsNullOrWhiteSpace(request.Code) && request.Code.Trim().ToUpper() != employee.Code)
            {
                var codeExists = await db.Employees.AnyAsync(e => e.Id != id && e.Code.ToLower() == request.Code.Trim().ToLower());
                if (codeExists)
                {
                    return Results.Conflict(new { message = $"Mã nhân viên {request.Code} đã được sử dụng." });
                }
                employee.Code = request.Code.Trim().ToUpper();
            }

            employee.Email = request.Email?.Trim();
            employee.Phone = request.Phone?.Trim();
            if (!string.IsNullOrWhiteSpace(request.Department)) employee.Department = request.Department.Trim();
            if (!string.IsNullOrWhiteSpace(request.Position)) employee.Position = request.Position.Trim();
            if (!string.IsNullOrWhiteSpace(request.Avatar)) employee.Avatar = request.Avatar.Trim();

            employee.ProjectId = request.ProjectId;
            employee.ShiftId = request.ShiftId;

            if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<EmployeeStatus>(request.Status, true, out var parsedStatus))
            {
                employee.Status = parsedStatus;
            }

            await db.SaveChangesAsync();

            Serilog.Log.Information("[EMPLOYEE_UPDATED] Cập nhật nhân sự {Code} - {Name}", employee.Code, employee.FullName);
            return Results.Ok(new { message = "Cập nhật nhân viên thành công!", employee });
        });

        // 4. Delete Employee
        group.MapDelete("/{id:guid}", async (Guid id, ApplicationDbContext db) =>
        {
            var employee = await db.Employees.FindAsync(id);
            if (employee == null)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên." });
            }

            // Kiểm tra xem nhân viên đã có dữ liệu chấm công không
            var hasAttendance = await db.Attendances.AnyAsync(a => a.EmployeeId == id);
            if (hasAttendance)
            {
                // Soft delete / Chuyển sang Inactive để bảo toàn toàn vẹn dữ liệu chấm công
                employee.Status = EmployeeStatus.Terminated;
                await db.SaveChangesAsync();

                Serilog.Log.Information("[EMPLOYEE_DEACTIVATED] Nhân viên {Code} có dữ liệu chấm công, chuyển sang trạng thái Nghỉ việc", employee.Code);
                return Results.Ok(new { message = $"Nhân viên {employee.FullName} đã có lịch sử chấm công, hệ thống đã chuyển sang trạng thái 'Đã nghỉ việc' (Inactive) để lưu trữ." });
            }

            // Nếu chưa có bảng công nào, xóa hoàn toàn
            db.Employees.Remove(employee);
            await db.SaveChangesAsync();

            Serilog.Log.Information("[EMPLOYEE_DELETED] Đã xóa vĩnh viễn nhân sự {Code} - {Name}", employee.Code, employee.FullName);
            return Results.Ok(new { message = $"Đã xóa thành công nhân viên {employee.FullName}." });
        });

        // 5. Bulk Update Employees
        group.MapPost("/bulk-update", async ([FromBody] BulkUpdateEmployeesRequest request, ApplicationDbContext db) =>
        {
            if (request.EmployeeIds == null || request.EmployeeIds.Count == 0)
            {
                return Results.BadRequest(new { message = "Danh sách nhân viên cần cập nhật không được rỗng." });
            }

            var employees = await db.Employees
                .Where(e => request.EmployeeIds.Contains(e.Id))
                .ToListAsync();

            if (employees.Count == 0)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên nào phù hợp." });
            }

            foreach (var emp in employees)
            {
                if (request.ProjectId.HasValue)
                {
                    emp.ProjectId = request.ProjectId.Value == Guid.Empty ? null : request.ProjectId.Value;
                }

                if (request.ShiftId.HasValue)
                {
                    emp.ShiftId = request.ShiftId.Value == Guid.Empty ? null : request.ShiftId.Value;
                }

                if (!string.IsNullOrWhiteSpace(request.Department))
                {
                    emp.Department = request.Department.Trim();
                }

                if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<EmployeeStatus>(request.Status, true, out var parsedStatus))
                {
                    emp.Status = parsedStatus;
                }
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[EMPLOYEES_BULK_UPDATED] Cập nhật hàng loạt cho {Count} nhân viên", employees.Count);

            return Results.Ok(new { 
                message = $"Đã cập nhật thành công {employees.Count} nhân viên được chọn!",
                updatedCount = employees.Count 
            });
        });

        // 6. Bulk Delete Employees
        group.MapPost("/bulk-delete", async ([FromBody] BulkDeleteEmployeesRequest request, ApplicationDbContext db) =>
        {
            if (request.EmployeeIds == null || request.EmployeeIds.Count == 0)
            {
                return Results.BadRequest(new { message = "Danh sách nhân sự cần xóa không được rỗng." });
            }

            var employees = await db.Employees
                .Where(e => request.EmployeeIds.Contains(e.Id))
                .ToListAsync();

            if (employees.Count == 0)
            {
                return Results.NotFound(new { message = "Không tìm thấy nhân viên nào để xóa." });
            }

            int deletedCount = 0;
            int archivedCount = 0;

            foreach (var emp in employees)
            {
                var hasAttendance = await db.Attendances.AnyAsync(a => a.EmployeeId == emp.Id);
                if (hasAttendance)
                {
                    emp.Status = EmployeeStatus.Terminated;
                    archivedCount++;
                }
                else
                {
                    db.Employees.Remove(emp);
                    deletedCount++;
                }
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[EMPLOYEES_BULK_DELETED] Xóa {Deleted} và lưu trữ {Archived} nhân viên", deletedCount, archivedCount);

            return Results.Ok(new { 
                message = $"Đã xử lý {employees.Count} nhân viên: Xóa hoàn toàn {deletedCount} người, chuyển sang lưu trữ {archivedCount} người do có dữ liệu chấm công.",
                deletedCount,
                archivedCount
            });
        });
    }
}

public record CreateEmployeeRequest(
    string Code,
    string FullName,
    string? Email,
    string? Phone,
    string? Department,
    string? Position,
    string? Avatar,
    DateTime? JoinDate,
    Guid? ProjectId,
    Guid? ShiftId
);

public record UpdateEmployeeRequest(
    string? Code,
    string? FullName,
    string? Email,
    string? Phone,
    string? Department,
    string? Position,
    string? Avatar,
    Guid? ProjectId,
    Guid? ShiftId,
    string? Status
);

public record BulkUpdateEmployeesRequest(
    List<Guid> EmployeeIds,
    Guid? ProjectId,
    Guid? ShiftId,
    string? Department,
    string? Status
);

public record BulkDeleteEmployeesRequest(
    List<Guid> EmployeeIds
);

