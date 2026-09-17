using BPOTime.Domain.Enums;

namespace BPOTime.Domain.Entities;

public class Employee
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? IdentityCardNumber { get; set; } // CCCD
    public string? Department { get; set; }
    public string? Position { get; set; }
    public string? Avatar { get; set; }
    public DateTime JoinDate { get; set; }
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    
    // Concurrency token
    public uint Version { get; set; }

    // Shift & Project Foreign Keys
    public Guid? ShiftId { get; set; }
    public Shift? Shift { get; set; }

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    // Navigation properties
    public User? User { get; set; }
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
}
