namespace BPOTime.Application.Authentication;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string Token,
    Guid UserId,
    string Email,
    string Username,
    List<string> Roles,
    Guid? EmployeeId = null,
    string? FullName = null,
    string? Avatar = null
);
