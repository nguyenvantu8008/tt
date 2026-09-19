using BPOTime.Domain.Enums;

namespace BPOTime.Domain.Entities;

public class PayrollPeriod
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int Month { get; set; }
    public int Year { get; set; }
    public string PeriodCode { get; set; } = string.Empty; // e.g. "2026-09"

    public PayrollPeriodStatus Status { get; set; } = PayrollPeriodStatus.Draft;

    public decimal TotalGrossPay { get; set; } = 0;
    public decimal TotalNetPay { get; set; } = 0;
    public int TotalEmployees { get; set; } = 0;

    public DateTime? CalculatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? LockedAt { get; set; }

    public string? ApprovedBy { get; set; }
    public string? LockedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<PayrollRecord> Records { get; set; } = new List<PayrollRecord>();
}
