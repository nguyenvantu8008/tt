using BPOTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BPOTime.Infrastructure.Data.Configurations;

public class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("Attendances");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Notes).HasMaxLength(500);
        builder.Property(x => x.CheckInDevice).HasMaxLength(100);

        builder.HasIndex(x => new { x.EmployeeId, x.Date }).IsUnique();
        builder.HasIndex(x => new { x.ProjectId, x.Date });
        builder.HasIndex(x => x.Date);

        builder.HasOne(x => x.Employee)
               .WithMany(e => e.Attendances)
               .HasForeignKey(x => x.EmployeeId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Project)
               .WithMany(p => p.Attendances)
               .HasForeignKey(x => x.ProjectId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Shift)
               .WithMany(s => s.Attendances)
               .HasForeignKey(x => x.ShiftId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
