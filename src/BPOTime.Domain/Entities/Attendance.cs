using BPOTime.Domain.Enums;

namespace BPOTime.Domain.Entities;

public class Attendance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid ShiftId { get; set; }
    public Shift Shift { get; set; } = null!;

    public DateOnly Date { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }

    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public double WorkedHours { get; set; } = 8.0;
    public double OtHours { get; set; } = 0.0;
    
    public string? Notes { get; set; }
    
    // GPS Geofencing verification fields
    public double? CheckInLatitude { get; set; }
    public double? CheckInLongitude { get; set; }
    public double? DistanceToProjectMeters { get; set; }
    public bool IsGpsVerified { get; set; } = false;
    public string? CheckInDevice { get; set; } // e.g. "Smartphone PWA", "Onsite Kiosk"
    
    // Support for Supervisor/Kiosk check-in
    public Guid? CheckedInBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
