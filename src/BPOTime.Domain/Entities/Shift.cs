namespace BPOTime.Domain.Entities;

public class Shift
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty; // e.g., "HC", "C1", "C2", "C3"
    public string Name { get; set; } = string.Empty; // e.g., "Ca Hành Chính"
    public TimeSpan StartTime { get; set; } // e.g., 08:00:00
    public TimeSpan EndTime { get; set; }   // e.g., 17:00:00
    public string BreakTime { get; set; } = "12:00 - 13:00";
    public double TotalHours { get; set; } = 8.0;

    // Navigation property
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}
