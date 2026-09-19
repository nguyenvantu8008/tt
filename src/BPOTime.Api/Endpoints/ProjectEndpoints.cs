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
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                AllowedRadiusMeters = (request.AllowedRadiusMeters.HasValue && request.AllowedRadiusMeters.Value > 0) ? request.AllowedRadiusMeters.Value : 20,
                RequireGps = request.RequireGps ?? true,
                Address = request.Address?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            db.Projects.Add(project);
            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_CREATED] Đã tạo mới dự án {Code} - {Name} với bán kính {Radius}m", project.Code, project.Name, project.AllowedRadiusMeters);
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
            
            project.Latitude = request.Latitude;
            project.Longitude = request.Longitude;
            if (request.AllowedRadiusMeters.HasValue && request.AllowedRadiusMeters.Value > 0)
                project.AllowedRadiusMeters = request.AllowedRadiusMeters.Value;
            if (request.RequireGps.HasValue) project.RequireGps = request.RequireGps.Value;
            project.Address = request.Address?.Trim();

            await db.SaveChangesAsync();

            Serilog.Log.Information("[PROJECT_UPDATED] Cập nhật dự án {Code} - {Name} bán kính {Radius}m", project.Code, project.Name, project.AllowedRadiusMeters);
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

        // 9. Bulk Update Project Status
        group.MapPost("/bulk-update-status", async ([FromBody] BulkUpdateProjectStatusRequest request, ApplicationDbContext db) =>
        {
            if (request.ProjectIds == null || request.ProjectIds.Count == 0)
            {
                return Results.BadRequest(new { message = "Danh sách dự án không được rỗng." });
            }

            var projects = await db.Projects
                .Where(p => request.ProjectIds.Contains(p.Id))
                .ToListAsync();

            if (projects.Count == 0)
            {
                return Results.NotFound(new { message = "Không tìm thấy dự án nào phù hợp." });
            }

            foreach (var p in projects)
            {
                p.Status = request.Status.Trim().ToUpper();
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[PROJECTS_BULK_STATUS_UPDATED] Cập nhật trạng thái {Status} cho {Count} dự án", request.Status, projects.Count);

            return Results.Ok(new { 
                message = $"Đã cập nhật trạng thái '{request.Status}' cho {projects.Count} dự án thành công!",
                updatedCount = projects.Count
            });
        });

        // 10. Bulk Delete Projects
        group.MapPost("/bulk-delete", async ([FromBody] BulkDeleteProjectsRequest request, ApplicationDbContext db) =>
        {
            if (request.ProjectIds == null || request.ProjectIds.Count == 0)
            {
                return Results.BadRequest(new { message = "Danh sách dự án cần xóa không được rỗng." });
            }

            var projects = await db.Projects
                .Include(p => p.Employees)
                .Where(p => request.ProjectIds.Contains(p.Id))
                .ToListAsync();

            if (projects.Count == 0)
            {
                return Results.NotFound(new { message = "Không tìm thấy dự án nào để xóa." });
            }

            int deletedCount = 0;
            int skippedCount = 0;

            foreach (var p in projects)
            {
                var attendanceCount = await db.Attendances.CountAsync(a => a.ProjectId == p.Id);
                if (attendanceCount > 0 && request.Force != true)
                {
                    // Tự động chuyển trạng thái sang ON_HOLD/INACTIVE thay vì xóa làm hỏng dữ liệu
                    p.Status = "ON_HOLD";
                    skippedCount++;
                }
                else
                {
                    if (attendanceCount > 0 && request.Force == true)
                    {
                        var attendances = await db.Attendances.Where(a => a.ProjectId == p.Id).ToListAsync();
                        db.Attendances.RemoveRange(attendances);
                    }

                    foreach (var emp in p.Employees)
                    {
                        emp.ProjectId = null;
                    }

                    db.Projects.Remove(p);
                    deletedCount++;
                }
            }

            await db.SaveChangesAsync();
            Serilog.Log.Information("[PROJECTS_BULK_DELETED] Xóa {Deleted}, tạm dừng {Skipped} dự án", deletedCount, skippedCount);

            return Results.Ok(new { 
                message = $"Đã xóa thành công {deletedCount} dự án" + (skippedCount > 0 ? $", tạm dừng {skippedCount} dự án do có dữ liệu chấm công." : "."),
                deletedCount,
                skippedCount
            });
        });
    }
}

public record CreateProjectRequest(
    string Code, 
    string Name, 
    string? Client, 
    string? Color,
    double? Latitude = null,
    double? Longitude = null,
    int? AllowedRadiusMeters = 20,
    bool? RequireGps = true,
    string? Address = null
);
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
public record BulkUpdateProjectStatusRequest(List<Guid> ProjectIds, string Status);
public record BulkDeleteProjectsRequest(List<Guid> ProjectIds, bool? Force);

