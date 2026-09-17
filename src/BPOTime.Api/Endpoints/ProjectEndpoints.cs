using BPOTime.Domain.Entities;
using BPOTime.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BPOTime.Api.Endpoints;

public static class ProjectEndpoints
{
    public static void MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects").WithTags("Projects");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            var projects = await db.Projects
                .Include(p => p.Employees)
                .Select(p => new
                {
                    p.Id,
                    p.Code,
                    p.Name,
                    p.Client,
                    p.Color,
                    p.Status,
                    p.Latitude,
                    p.Longitude,
                    p.AllowedRadiusMeters,
                    p.RequireGps,
                    p.Address,
                    TotalMembers = p.Employees.Count
                })
                .ToListAsync();

            return Results.Ok(projects);
        });

        // Update Project GPS coordinates
        group.MapPut("/{id:guid}/gps", async (Guid id, [FromBody] UpdateProjectGpsRequest request, ApplicationDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            if (project == null) return Results.NotFound(new { message = "Không tìm thấy dự án." });

            project.Latitude = request.Latitude;
            project.Longitude = request.Longitude;
            project.AllowedRadiusMeters = request.AllowedRadiusMeters > 0 ? request.AllowedRadiusMeters : 150;
            project.RequireGps = request.RequireGps;
            project.Address = request.Address?.Trim();

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Cập nhật tọa độ GPS dự án thành công!", project });
        });

        // 3. Create Project
        group.MapPost("/", async ([FromBody] CreateProjectRequest request, ApplicationDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new { message = "Mã và tên dự án không được để trống." });
            }

            var exists = await db.Projects.AnyAsync(p => p.Code.ToLower() == request.Code.Trim().ToLower());
            if (exists)
            {
                return Results.Conflict(new { message = $"Dự án với mã {request.Code} đã tồn tại." });
            }

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Code = request.Code.Trim().ToUpper(),
                Name = request.Name.Trim(),
                Client = request.Client?.Trim() ?? string.Empty,
                Color = string.IsNullOrWhiteSpace(request.Color) ? "#2563EB" : request.Color.Trim(),
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow
            };

            db.Projects.Add(project);
            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_CREATED] Đã tạo mới dự án {Code} - {Name}", project.Code, project.Name);
            return Results.Created($"/api/projects/{project.Id}", project);
        });

        // 4. Update Full Project Information
        group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdateProjectRequest request, ApplicationDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            if (project == null) return Results.NotFound(new { message = "Không tìm thấy dự án." });

            if (!string.IsNullOrWhiteSpace(request.Name)) project.Name = request.Name.Trim();
            if (!string.IsNullOrWhiteSpace(request.Client)) project.Client = request.Client.Trim();
            if (!string.IsNullOrWhiteSpace(request.Color)) project.Color = request.Color.Trim();
            if (!string.IsNullOrWhiteSpace(request.Status)) project.Status = request.Status.Trim();
            
            if (request.Latitude.HasValue) project.Latitude = request.Latitude.Value;
            if (request.Longitude.HasValue) project.Longitude = request.Longitude.Value;
            if (request.AllowedRadiusMeters.HasValue && request.AllowedRadiusMeters.Value > 0)
                project.AllowedRadiusMeters = request.AllowedRadiusMeters.Value;
            if (request.RequireGps.HasValue) project.RequireGps = request.RequireGps.Value;
            if (!string.IsNullOrWhiteSpace(request.Address)) project.Address = request.Address.Trim();

            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_UPDATED] Cập nhật dự án {Code} - {Name}", project.Code, project.Name);
            return Results.Ok(new { message = "Cập nhật dự án thành công!", project });
        });

        // 5. Delete Project
        group.MapDelete("/{id:guid}", async (Guid id, [FromQuery] bool? force, ApplicationDbContext db) =>
        {
            var project = await db.Projects
                .Include(p => p.Employees)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null) return Results.NotFound(new { message = "Không tìm thấy dự án." });

            var attendanceCount = await db.Attendances.CountAsync(a => a.ProjectId == id);
            if (attendanceCount > 0 && force != true)
            {
                return Results.BadRequest(new
                {
                    message = $"Dự án '{project.Code} - {project.Name}' đang có {attendanceCount} bản ghi chấm công thực tế trong hệ thống. Để bảo toàn dữ liệu lịch sử bảng công, hệ thống không cho phép xóa vĩnh viễn trực tiếp. Bạn có thể chọn chuyển trạng thái sang Tạm dừng hoặc chọn Xác nhận xóa vĩnh viễn kèm dữ liệu.",
                    hasAttendances = true,
                    attendanceCount
                });
            }

            if (attendanceCount > 0 && force == true)
            {
                var attendances = await db.Attendances.Where(a => a.ProjectId == id).ToListAsync();
                db.Attendances.RemoveRange(attendances);
                Serilog.Log.Warning("[PROJECT_FORCE_DELETE] Đã xóa kèm {Count} bản ghi chấm công của dự án {Code}", attendanceCount, project.Code);
            }

            // Gỡ liên kết các nhân viên thuộc dự án này về null
            foreach (var emp in project.Employees)
            {
                emp.ProjectId = null;
            }

            db.Projects.Remove(project);
            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_DELETED] Đã xóa dự án {Code} - {Name}", project.Code, project.Name);
            return Results.Ok(new { message = $"Đã xóa thành công dự án {project.Code} - {project.Name}." });
        });

        // 6. Get Project Members
        group.MapGet("/{id:guid}/members", async (Guid id, ApplicationDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            if (project == null) return Results.NotFound(new { message = "Không tìm thấy dự án." });

            var members = await db.Employees
                .Include(e => e.Shift)
                .Where(e => e.ProjectId == id)
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
                    ShiftName = e.Shift != null ? e.Shift.Name : null,
                    Status = e.Status.ToString().ToUpper()
                })
                .ToListAsync();

            return Results.Ok(new
            {
                ProjectId = project.Id,
                ProjectCode = project.Code,
                ProjectName = project.Name,
                TotalMembers = members.Count,
                Members = members
            });
        });

        // 7. Add Member to Project
        group.MapPost("/{id:guid}/members", async (Guid id, [FromBody] AddProjectMemberRequest request, ApplicationDbContext db) =>
        {
            var project = await db.Projects.FindAsync(id);
            if (project == null) return Results.NotFound(new { message = "Không tìm thấy dự án." });

            var employee = await db.Employees.FindAsync(request.EmployeeId);
            if (employee == null) return Results.NotFound(new { message = "Không tìm thấy nhân viên." });

            employee.ProjectId = id;
            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_MEMBER_ADDED] Đã phân công nhân viên {Emp} vào dự án {Project}", employee.Code, project.Code);
            return Results.Ok(new { message = $"Đã gán thành công nhân viên {employee.FullName} vào dự án {project.Code}." });
        });

        // 8. Remove Member from Project
        group.MapDelete("/{id:guid}/members/{employeeId:guid}", async (Guid id, Guid employeeId, ApplicationDbContext db) =>
        {
            var employee = await db.Employees.FirstOrDefaultAsync(e => e.Id == employeeId && e.ProjectId == id);
            if (employee == null) return Results.NotFound(new { message = "Nhân viên không thuộc dự án này." });

            employee.ProjectId = null;
            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_MEMBER_REMOVED] Đã rút nhân viên {Emp} khỏi dự án ID {Project}", employee.Code, id);
            return Results.Ok(new { message = $"Đã rút thành công nhân viên {employee.FullName} khỏi dự án." });
        });
    }
}

public record CreateProjectRequest(string Code, string Name, string? Client, string? Color);
public record UpdateProjectRequest(
    string? Name,
    string? Client,
    string? Color,
    string? Status,
    double? Latitude,
    double? Longitude,
    int? AllowedRadiusMeters,
    bool? RequireGps,
    string? Address
);
public record UpdateProjectGpsRequest(double Latitude, double Longitude, int AllowedRadiusMeters, bool RequireGps, string? Address);
public record AddProjectMemberRequest(Guid EmployeeId);
