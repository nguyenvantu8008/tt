using BPOTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BPOTime.Infrastructure.Data.Configurations;

public class SalaryPolicyConfiguration : IEntityTypeConfiguration<SalaryPolicy>
{
    public void Configure(EntityTypeBuilder<SalaryPolicy> builder)
    {
        builder.ToTable("SalaryPolicies");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.HourlyRate).HasPrecision(18, 2);
        builder.Property(x => x.DailyAttendanceRate).HasPrecision(18, 2);
        builder.Property(x => x.DailyCalendarRate).HasPrecision(18, 2);
        builder.Property(x => x.MonthlySalary).HasPrecision(18, 2);

        builder.Property(x => x.Note).HasMaxLength(500);

        builder.HasIndex(x => new { x.EmployeeId, x.EffectiveFrom });
        builder.HasIndex(x => new { x.EmployeeId, x.IsActive });

        builder.HasOne(x => x.Employee)
               .WithMany(e => e.SalaryPolicies)
               .HasForeignKey(x => x.EmployeeId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
