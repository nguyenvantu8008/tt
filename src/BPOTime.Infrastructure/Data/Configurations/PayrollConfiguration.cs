using BPOTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BPOTime.Infrastructure.Data.Configurations;

public class PayrollPeriodConfiguration : IEntityTypeConfiguration<PayrollPeriod>
{
    public void Configure(EntityTypeBuilder<PayrollPeriod> builder)
    {
        builder.ToTable("PayrollPeriods");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.PeriodCode).HasMaxLength(20);
        builder.HasIndex(x => x.PeriodCode).IsUnique();
        builder.HasIndex(x => new { x.Year, x.Month });

        builder.Property(x => x.TotalGrossPay).HasPrecision(18, 2);
        builder.Property(x => x.TotalNetPay).HasPrecision(18, 2);

        builder.HasMany(p => p.Records)
               .WithOne(r => r.PayrollPeriod)
               .HasForeignKey(r => r.PayrollPeriodId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PayrollRecordConfiguration : IEntityTypeConfiguration<PayrollRecord>
{
    public void Configure(EntityTypeBuilder<PayrollRecord> builder)
    {
        builder.ToTable("PayrollRecords");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.RateUnit).HasPrecision(18, 2);
        builder.Property(x => x.BasePay).HasPrecision(18, 2);
        builder.Property(x => x.OtBaseHourlyRate).HasPrecision(18, 2);
        builder.Property(x => x.OtPay).HasPrecision(18, 2);
        builder.Property(x => x.Bonus).HasPrecision(18, 2);
        builder.Property(x => x.Allowance).HasPrecision(18, 2);
        builder.Property(x => x.Advance).HasPrecision(18, 2);
        builder.Property(x => x.Deduction).HasPrecision(18, 2);
        builder.Property(x => x.InsuranceDeduction).HasPrecision(18, 2);
        builder.Property(x => x.GrossPay).HasPrecision(18, 2);
        builder.Property(x => x.NetPay).HasPrecision(18, 2);

        builder.HasIndex(x => new { x.PayrollPeriodId, x.EmployeeId }).IsUnique();
        builder.HasIndex(x => x.EmployeeId);

        builder.HasOne(x => x.Employee)
               .WithMany(e => e.PayrollRecords)
               .HasForeignKey(x => x.EmployeeId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.SalaryPolicy)
               .WithMany()
               .HasForeignKey(x => x.SalaryPolicyId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}

public class PayrollSettingConfiguration : IEntityTypeConfiguration<PayrollSetting>
{
    public void Configure(EntityTypeBuilder<PayrollSetting> builder)
    {
        builder.ToTable("PayrollSettings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Currency).HasMaxLength(10);
    }
}
