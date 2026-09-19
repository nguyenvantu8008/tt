using BPOTime.Domain.Enums;

namespace BPOTime.Domain.Entities;

public class PayrollSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public double StandardHoursPerDay { get; set; } = 8.0;
    public double StandardWorkDaysPerMonth { get; set; } = 26.0;

    // Overtime multipliers
    public double OtNormalDayMultiplier { get; set; } = 1.5;
    public double OtWeekendMultiplier { get; set; } = 2.0;
    public double OtHolidayMultiplier { get; set; } = 3.0;

    // Social insurance deductions (Configurable, NOT hard-coded)
    public double SocialInsuranceEmployeeRate { get; set; } = 0.105; // 10.5% default VN law
    public double SocialInsuranceEmployerRate { get; set; } = 0.215; // 21.5%

    // Currency and rounding
    public RoundingMethod RoundingMethod { get; set; } = RoundingMethod.Nearest;
    public int RoundingPrecision { get; set; } = 1; // 1 = nearest 1 VND, 10, 100, 1000
    public string Currency { get; set; } = "VND";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }
}
