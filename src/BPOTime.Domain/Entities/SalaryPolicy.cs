using BPOTime.Domain.Enums;

namespace BPOTime.Domain.Entities;

public class SalaryPolicy
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public SalaryType SalaryType { get; set; } = SalaryType.DailyAttendance;

    // Rates according to SalaryType
    public decimal? HourlyRate { get; set; }
    public decimal? DailyAttendanceRate { get; set; }
    public decimal? DailyCalendarRate { get; set; }
    public decimal? MonthlySalary { get; set; }

    // Standard work parameters
    public double StandardHoursPerDay { get; set; } = 8.0;
    public double StandardWorkDaysPerMonth { get; set; } = 26.0;

    // Proration policy for Monthly salary
    public MonthlyProrationMethod ProrationMethod { get; set; } = MonthlyProrationMethod.StandardWorkDays;

    // Effective dates
    public DateOnly EffectiveFrom { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? EffectiveTo { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// Helper to get the active primary rate unit based on SalaryType
    /// </summary>
    public decimal GetPrimaryRate()
    {
        return SalaryType switch
        {
            SalaryType.Hourly => HourlyRate ?? 0,
            SalaryType.DailyAttendance => DailyAttendanceRate ?? 0,
            SalaryType.DailyCalendar => DailyCalendarRate ?? 0,
            SalaryType.Monthly => MonthlySalary ?? 0,
            _ => 0
        };
    }
}
