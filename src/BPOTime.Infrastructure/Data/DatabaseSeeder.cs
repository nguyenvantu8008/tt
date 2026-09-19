using BPOTime.Domain.Entities;
using BPOTime.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BPOTime.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context, ILogger logger)
    {
        try
        {
            // 1. Ensure standard roles exist
            var roles = new[] { "SUPER_ADMIN", "HR", "EMPLOYEE" };
            foreach (var roleName in roles)
            {
                var roleExists = await context.Roles.AnyAsync(r => r.Name == roleName);
                if (!roleExists)
                {
                    context.Roles.Add(new Role
                    {
                        Id = Guid.NewGuid(),
                        Name = roleName,
                        Description = $"System role: {roleName}"
                    });
                }
            }
            await context.SaveChangesAsync();

            // 2. Check if admin user already exists
            const string adminEmail = "admin@bpotime.com";
            var adminUser = await context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Email == adminEmail);

            if (adminUser == null)
            {
                var superAdminRole = await context.Roles.FirstAsync(r => r.Name == "SUPER_ADMIN");
                var newAdmin = new User
                {
                    Id = Guid.NewGuid(),
                    Username = "admin",
                    Email = adminEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                newAdmin.UserRoles.Add(new UserRole
                {
                    UserId = newAdmin.Id,
                    RoleId = superAdminRole.Id
                });

                context.Users.Add(newAdmin);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded default admin user: {Email}", adminEmail);
            }

            // 3. Seed Shifts
            if (!await context.Shifts.AnyAsync())
            {
                var shifts = new List<Shift>
                {
                    new Shift { Id = Guid.NewGuid(), Code = "HC", Name = "Ca Hành Chính", StartTime = new TimeSpan(8, 0, 0), EndTime = new TimeSpan(17, 0, 0), BreakTime = "12:00 - 13:00", TotalHours = 8.0 },
                    new Shift { Id = Guid.NewGuid(), Code = "C1", Name = "Ca Sáng (Ca 1)", StartTime = new TimeSpan(6, 0, 0), EndTime = new TimeSpan(14, 0, 0), BreakTime = "10:00 - 10:30", TotalHours = 7.5 },
                    new Shift { Id = Guid.NewGuid(), Code = "C2", Name = "Ca Chiều (Ca 2)", StartTime = new TimeSpan(14, 0, 0), EndTime = new TimeSpan(22, 0, 0), BreakTime = "18:00 - 18:30", TotalHours = 7.5 },
                    new Shift { Id = Guid.NewGuid(), Code = "C3", Name = "Ca Đêm (Ca 3)", StartTime = new TimeSpan(22, 0, 0), EndTime = new TimeSpan(6, 0, 0), BreakTime = "02:00 - 02:30", TotalHours = 7.5 },
                };
                context.Shifts.AddRange(shifts);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded standard Shifts.");
            }

            // 4. Seed Projects
            if (!await context.Projects.AnyAsync())
            {
                var projects = new List<Project>
                {
                    new Project { Id = Guid.NewGuid(), Code = "BPO-SHOPEE", Name = "Chăm sóc Khách hàng Shopee Express", Client = "Shopee Vietnam", Color = "#EE4D2D", Status = "ACTIVE" },
                    new Project { Id = Guid.NewGuid(), Code = "BPO-TIKTOK", Name = "Kiểm duyệt Nội dung TikTok Live & Shop", Client = "ByteDance SG", Color = "#00F2FE", Status = "ACTIVE" },
                    new Project { Id = Guid.NewGuid(), Code = "BPO-VPBANK", Name = "Xử lý & Nhập liệu Hồ sơ Tín dụng", Client = "VPBank Digital", Color = "#00A651", Status = "ACTIVE" },
                    new Project { Id = Guid.NewGuid(), Code = "BPO-GRAB", Name = "Hỗ trợ Tài xế & Đối tác Nhà hàng Grab", Client = "Grab Vietnam", Color = "#00B14F", Status = "ACTIVE" },
                };
                context.Projects.AddRange(projects);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded standard Projects.");
            }

            // 5. Seed Employees
            if (!await context.Employees.AnyAsync())
            {
                var defaultShift = await context.Shifts.FirstAsync(s => s.Code == "HC");
                var shift1 = await context.Shifts.FirstAsync(s => s.Code == "C1");
                var shift2 = await context.Shifts.FirstAsync(s => s.Code == "C2");
                var shift3 = await context.Shifts.FirstAsync(s => s.Code == "C3");

                var projShopee = await context.Projects.FirstAsync(p => p.Code == "BPO-SHOPEE");
                var projTikTok = await context.Projects.FirstAsync(p => p.Code == "BPO-TIKTOK");
                var projVPBank = await context.Projects.FirstAsync(p => p.Code == "BPO-VPBANK");
                var projGrab = await context.Projects.FirstAsync(p => p.Code == "BPO-GRAB");

                var employees = new List<Employee>
                {
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1001", FullName = "Nguyễn Văn An", Email = "an.nguyen@bpotime.com", Phone = "0912 345 678", Department = "CSKH & Hotline", Position = "Trưởng nhóm CSKH", ShiftId = defaultShift.Id, ProjectId = projShopee.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 1, 15), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1002", FullName = "Trần Thị Bích Ngọc", Email = "ngoc.tran@bpotime.com", Phone = "0988 123 456", Department = "Kiểm duyệt nội dung", Position = "Chuyên viên kiểm duyệt cao cấp", ShiftId = shift1.Id, ProjectId = projTikTok.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 3, 1), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1003", FullName = "Lê Hoàng Nam", Email = "nam.le@bpotime.com", Phone = "0977 654 321", Department = "Nhập liệu & Số hóa", Position = "Nhân viên nhập liệu cấp 2", ShiftId = defaultShift.Id, ProjectId = projVPBank.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 6, 10), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1004", FullName = "Phạm Minh Tuấn", Email = "tuan.pham@bpotime.com", Phone = "0903 888 999", Department = "Kỹ thuật & Helpdesk", Position = "Kỹ sư hỗ trợ hệ thống", ShiftId = shift3.Id, ProjectId = projTikTok.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 4, 12), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1005", FullName = "Võ Thị Mai Lan", Email = "lan.vo@bpotime.com", Phone = "0934 567 890", Department = "CSKH & Hotline", Position = "Điện thoại viên CSKH", ShiftId = shift2.Id, ProjectId = projShopee.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 8, 20), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1006", FullName = "Đỗ Quốc Bảo", Email = "bao.do@bpotime.com", Phone = "0919 222 333", Department = "Kiểm duyệt nội dung", Position = "Nhân viên kiểm duyệt ca tối", ShiftId = shift2.Id, ProjectId = projTikTok.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 9, 1), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1007", FullName = "Hoàng Kim Ngân", Email = "ngan.hoang@bpotime.com", Phone = "0945 678 123", Department = "CSKH & Hotline", Position = "Điện thoại viên Grab", ShiftId = shift1.Id, ProjectId = projGrab.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2023, 10, 15), DateTimeKind.Utc), Status = EmployeeStatus.Probation, Avatar = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" },
                    new Employee { Id = Guid.NewGuid(), Code = "BPO-1008", FullName = "Bùi Đức Anh", Email = "anh.bui@bpotime.com", Phone = "0922 888 777", Department = "Nhập liệu & Số hóa", Position = "Trưởng nhóm thẩm định VPBank", ShiftId = defaultShift.Id, ProjectId = projVPBank.Id, JoinDate = DateTime.SpecifyKind(new DateTime(2022, 11, 1), DateTimeKind.Utc), Status = EmployeeStatus.Active, Avatar = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80" },
                };

                context.Employees.AddRange(employees);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded default Employees.");
            }

            // 6. Seed Today's Attendance
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (!await context.Attendances.AnyAsync(a => a.Date == today))
            {
                var employees = await context.Employees.ToListAsync();
                var attendances = new List<Attendance>();

                foreach (var emp in employees)
                {
                    if (emp.ShiftId == null || emp.ProjectId == null) continue;

                    attendances.Add(new Attendance
                    {
                        Id = Guid.NewGuid(),
                        EmployeeId = emp.Id,
                        ProjectId = emp.ProjectId.Value,
                        ShiftId = emp.ShiftId.Value,
                        Date = today,
                        CheckInTime = new TimeOnly(7, 55),
                        CheckOutTime = null,
                        Status = AttendanceStatus.Present,
                        WorkedHours = 8.0,
                        OtHours = 0,
                        Notes = "Đúng giờ"
                    });
                }

                if (attendances.Count > 0)
                {
                    context.Attendances.AddRange(attendances);
                    await context.SaveChangesAsync();
                    logger.LogInformation("Seeded today's initial Attendance.");
                }
            }

            // 7. Ensure All Employees Have User Accounts for Login
            var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "EMPLOYEE");
            if (employeeRole != null)
            {
                var allEmployees = await context.Employees.ToListAsync();
                var existingUsers = await context.Users.ToListAsync();
                var usersToAdd = new List<User>();

                foreach (var emp in allEmployees)
                {
                    var userExists = existingUsers.Any(u => u.EmployeeId == emp.Id || (!string.IsNullOrWhiteSpace(emp.Email) && u.Email.ToLower() == emp.Email.ToLower()));
                    if (!userExists)
                    {
                        var email = !string.IsNullOrWhiteSpace(emp.Email) ? emp.Email.Trim().ToLower() : $"{emp.Code.ToLower()}@bpotime.com";
                        var newUser = new User
                        {
                            Id = Guid.NewGuid(),
                            Username = emp.Code.ToLower(),
                            Email = email,
                            PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                            EmployeeId = emp.Id,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };

                        newUser.UserRoles.Add(new UserRole
                        {
                            UserId = newUser.Id,
                            RoleId = employeeRole.Id
                        });

                        usersToAdd.Add(newUser);
                    }
                }

                if (usersToAdd.Count > 0)
                {
                    context.Users.AddRange(usersToAdd);
                    await context.SaveChangesAsync();
                    logger.LogInformation("Seeded {Count} employee user accounts with default password '123456'.", usersToAdd.Count);
                }
            }

            // 8. Seed Default PayrollSetting
            if (!await context.PayrollSettings.AnyAsync())
            {
                var defaultSetting = new PayrollSetting
                {
                    Id = Guid.NewGuid(),
                    StandardHoursPerDay = 8.0,
                    StandardWorkDaysPerMonth = 26.0,
                    OtNormalDayMultiplier = 1.5,
                    OtWeekendMultiplier = 2.0,
                    OtHolidayMultiplier = 3.0,
                    SocialInsuranceEmployeeRate = 0.105,
                    SocialInsuranceEmployerRate = 0.215,
                    RoundingPrecision = 1,
                    Currency = "VND",
                    UpdatedAt = DateTime.UtcNow
                };
                context.PayrollSettings.Add(defaultSetting);
                await context.SaveChangesAsync();
                logger.LogInformation("Seeded default PayrollSetting.");
            }

            // 9. Seed Salary Policies for 8 standard employees (demonstrating all 4 salary types)
            if (!await context.SalaryPolicies.AnyAsync())
            {
                var employees = await context.Employees.ToListAsync();
                var policies = new List<SalaryPolicy>();
                var startOfYear = new DateOnly(2026, 1, 1);

                foreach (var emp in employees)
                {
                    var policy = new SalaryPolicy
                    {
                        Id = Guid.NewGuid(),
                        EmployeeId = emp.Id,
                        StandardHoursPerDay = 8.0,
                        StandardWorkDaysPerMonth = 26.0,
                        EffectiveFrom = startOfYear,
                        EffectiveTo = null,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    switch (emp.Code)
                    {
                        case "BPO-1001":
                            policy.SalaryType = SalaryType.DailyAttendance;
                            policy.DailyAttendanceRate = 500000m;
                            policy.Note = "Lương theo công dự án Shopee (500.000 đ/công)";
                            break;
                        case "BPO-1002":
                            policy.SalaryType = SalaryType.Hourly;
                            policy.HourlyRate = 50000m;
                            policy.Note = "Lương theo giờ kiểm duyệt TikTok (50.000 đ/giờ)";
                            break;
                        case "BPO-1003":
                            policy.SalaryType = SalaryType.DailyCalendar;
                            policy.DailyCalendarRate = 300000m;
                            policy.Note = "Lương theo ngày trực nhập liệu VPBank (300.000 đ/ngày)";
                            break;
                        case "BPO-1004":
                            policy.SalaryType = SalaryType.Monthly;
                            policy.MonthlySalary = 12000000m;
                            policy.ProrationMethod = MonthlyProrationMethod.StandardWorkDays;
                            policy.Note = "Lương tháng Kỹ sư Helpdesk (12.000.000 đ/tháng, prorate 26 công)";
                            break;
                        case "BPO-1005":
                            policy.SalaryType = SalaryType.DailyAttendance;
                            policy.DailyAttendanceRate = 450000m;
                            policy.Note = "Lương theo công CSKH Shopee (450.000 đ/công)";
                            break;
                        case "BPO-1006":
                            policy.SalaryType = SalaryType.Hourly;
                            policy.HourlyRate = 55000m;
                            policy.Note = "Lương theo giờ kiểm duyệt ca tối TikTok (55.000 đ/giờ)";
                            break;
                        case "BPO-1007":
                            policy.SalaryType = SalaryType.DailyCalendar;
                            policy.DailyCalendarRate = 320000m;
                            policy.Note = "Lương theo ngày CSKH Grab (320.000 đ/ngày)";
                            break;
                        case "BPO-1008":
                            policy.SalaryType = SalaryType.Monthly;
                            policy.MonthlySalary = 15000000m;
                            policy.ProrationMethod = MonthlyProrationMethod.StandardWorkDays;
                            policy.Note = "Lương tháng Trưởng nhóm thẩm định VPBank (15.000.000 đ/tháng)";
                            break;
                        default:
                            policy.SalaryType = SalaryType.DailyAttendance;
                            policy.DailyAttendanceRate = 400000m;
                            break;
                    }

                    policies.Add(policy);
                }

                if (policies.Count > 0)
                {
                    context.SalaryPolicies.AddRange(policies);
                    await context.SaveChangesAsync();
                    logger.LogInformation("Seeded initial Salary Policies for {Count} employees across 4 salary types.", policies.Count);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not run database seeder. Please ensure the database is reachable.");
        }
    }
}
