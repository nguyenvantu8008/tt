using BPOTime.Domain.Enums;

namespace BPOTime.Domain.Entities;

public class PayrollRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PayrollPeriodId { get; set; }
    public PayrollPeriod PayrollPeriod { get; set; } = null!;

    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public Guid? SalaryPolicyId { get; set; }
    public SalaryPolicy? SalaryPolicy { get; set; }

    // Snapshot of configuration used at calculation time
    public SalaryType SalaryType { get; set; }
    public decimal RateUnit { get; set; } // The rate applied (e.g. 500,000 / công, 50,000 / h, etc.)
    public double StandardHoursPerDay { get; set; }
    public double StandardWorkDaysPerMonth { get; set; }

    // Attendance results in the period
    public double WorkedHours { get; set; }
    public double AttendanceUnits { get; set; }
    public int ValidWorkDays { get; set; }

    // Pay components
    public decimal BasePay { get; set; }

    public double OtHours { get; set; }
    public decimal OtBaseHourlyRate { get; set; }
    public decimal OtPay { get; set; }

    public decimal Bonus { get; set; } = 0;
    public decimal Allowance { get; set; } = 0;
    public decimal Advance { get; set; } = 0;
    public decimal Deduction { get; set; } = 0;
    public decimal InsuranceDeduction { get; set; } = 0;

    public decimal GrossPay { get; set; }
    public decimal NetPay { get; set; }

    // Anomalies
    public bool IsAnomaly { get; set; } = false;
    public string? AnomalyReason { get; set; }

    // Detailed formula explanation (e.g. JSON or readable steps for Breakdown Modal)
    public string? BreakdownJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
