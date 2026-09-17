namespace BPOTime.Domain.Entities;

public class LeaveRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    
    public string LeaveType { get; set; } = "ANNUAL"; // ANNUAL, SICK, UNPAID
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED
    
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
