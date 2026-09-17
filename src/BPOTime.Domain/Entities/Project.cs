namespace BPOTime.Domain.Entities;

public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty; // e.g., "BPO-SHOPEE"
    public string Name { get; set; } = string.Empty;
    public string Client { get; set; } = string.Empty;
    public string Color { get; set; } = "#2563EB";
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, PAUSED, COMPLETED
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // GPS Geofencing configuration for remote/onsite projects
    public double? Latitude { get; set; } // e.g. 21.028511
    public double? Longitude { get; set; } // e.g. 105.854444
    public int AllowedRadiusMeters { get; set; } = 150; // Default 150m radius
    public bool RequireGps { get; set; } = true;
    public string? Address { get; set; }

    // Navigation property
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}
