using BPOTime.Domain.Enums;

namespace BPOTime.Application.Payroll;

public class PayrollCalculationResult
{
    public Guid EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Position { get; set; }
    public string? ProjectCode { get; set; }

    public Guid? SalaryPolicyId { get; set; }
    public SalaryType SalaryType { get; set; }
    public string SalaryTypeName { get; set; } = string.Empty;

    public decimal RateUnit { get; set; }
    public double StandardHoursPerDay { get; set; } = 8.0;
    public double StandardWorkDaysPerMonth { get; set; } = 26.0;

    // Attendance metrics
    public double WorkedHours { get; set; }
    public double AttendanceUnits { get; set; }
    public int ValidWorkDays { get; set; }

    // Calculated amounts
    public decimal BasePay { get; set; }

    public double OtHours { get; set; }
    public decimal OtBaseHourlyRate { get; set; }
    public double OtMultiplier { get; set; } = 1.5;
    public decimal OtPay { get; set; }

    public decimal Bonus { get; set; }
    public decimal Allowance { get; set; }
    public decimal Advance { get; set; }
    public decimal Deduction { get; set; }
    public decimal InsuranceDeduction { get; set; }

    public decimal GrossPay { get; set; }
    public decimal NetPay { get; set; }

    // Anomaly tracking
    public bool IsAnomaly { get; set; }
    public string? AnomalyReason { get; set; }

    // Human-readable breakdown steps
    public List<string> BreakdownLines { get; set; } = new();
    public string BreakdownJson { get; set; } = string.Empty;
}

public class PayrollPeriodPreviewResult
{
    public string PeriodCode { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public PayrollPeriodStatus Status { get; set; }
    public decimal TotalGrossPay { get; set; }
    public decimal TotalNetPay { get; set; }
    public int TotalEmployees { get; set; }
    public int HourlyCount { get; set; }
    public int DailyAttendanceCount { get; set; }
    public int DailyCalendarCount { get; set; }
    public int MonthlyCount { get; set; }
    public int AnomaliesCount { get; set; }
    public int UnconfiguredCount { get; set; }

    public List<PayrollCalculationResult> Items { get; set; } = new();
}
