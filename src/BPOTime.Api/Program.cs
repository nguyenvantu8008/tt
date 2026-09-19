using BPOTime.Infrastructure.Data;
using BPOTime.Infrastructure;
using BPOTime.Api.Endpoints;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Cloud Port Binding (Render, Railway, Fly.io support)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Setup Serilog with Console & File logging
builder.Host.UseSerilog((context, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console()
        .WriteTo.File(
            path: "logs/errors-.log",
            restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Error,
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File(
            path: "logs/app-.log",
            restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Information,
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14));

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAuthorization();
builder.Services.AddHttpClient();
builder.Services.AddScoped<BPOTime.Application.Payroll.IPayrollCalculationService, BPOTime.Application.Payroll.PayrollCalculationService>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseMiddleware<BPOTime.Api.Middleware.ExceptionHandlingMiddleware>();

app.UseSerilogRequestLogging();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
});

// Enable Swagger UI documentation
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Migrate and Seed database
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("Database migration applied successfully.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not apply database migrations automatically. Please ensure PostgreSQL is running.");
    }
    await DatabaseSeeder.SeedAsync(dbContext, logger);
}


// Authentication Endpoints
app.MapPost("/api/auth/login", async (
    [Microsoft.AspNetCore.Mvc.FromBody] BPOTime.Application.Authentication.LoginRequest request,
    ApplicationDbContext dbContext,
    BPOTime.Application.Authentication.IJwtProvider jwtProvider) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Email và mật khẩu không được để trống." });
    }

    var identifier = request.Email.Trim().ToLower();
    var user = await dbContext.Users
        .Include(u => u.UserRoles)
        .ThenInclude(ur => ur.Role)
        .Include(u => u.Employee)
        .FirstOrDefaultAsync(u => 
            u.Email.ToLower() == identifier || 
            u.Username.ToLower() == identifier ||
            (u.Employee != null && u.Employee.Code.ToLower() == identifier));

    if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
    {
        return Results.Json(new { message = "Email, mã nhân viên hoặc mật khẩu không chính xác." }, statusCode: StatusCodes.Status401Unauthorized);
    }

    if (!user.IsActive)
    {
        return Results.Json(new { message = "Tài khoản của bạn đã bị vô hiệu hóa." }, statusCode: StatusCodes.Status403Forbidden);
    }

    var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
    var token = jwtProvider.GenerateToken(user.Id, user.Email, roles);

    return Results.Ok(new BPOTime.Application.Authentication.LoginResponse(
        Token: token,
        UserId: user.Id,
        Email: user.Email,
        Username: user.Username,
        Roles: roles,
        EmployeeId: user.EmployeeId,
        FullName: user.Employee?.FullName ?? user.Username,
        Avatar: user.Employee?.Avatar
    ));
})
.WithName("Login")
.WithOpenApi();

// Map Time & Attendance API Modules
app.MapProjectEndpoints();
app.MapShiftEndpoints();
app.MapEmployeeEndpoints();
app.MapAttendanceEndpoints();
app.MapGeoEndpoints();
app.MapSalaryPolicyEndpoints();
app.MapPayrollEndpoints();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
});

app.MapGet("/api/health", () => Results.Ok(new { 
    status = "Healthy", 
    service = "BPOTime Realtime API",
    version = "1.0.0",
    timestamp = DateTime.UtcNow 
}));

app.MapFallbackToFile("index.html");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
