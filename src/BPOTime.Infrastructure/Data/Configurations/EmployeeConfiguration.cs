using BPOTime.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BPOTime.Infrastructure.Data.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Code).IsRequired().HasMaxLength(20);
        builder.Property(x => x.FullName).IsRequired().HasMaxLength(150);
        builder.Property(x => x.Phone).HasMaxLength(20);
        builder.Property(x => x.Email).HasMaxLength(100);
        builder.Property(x => x.IdentityCardNumber).HasMaxLength(20);
        
        builder.HasIndex(x => x.Code).IsUnique();
        
        // Optimistic concurrency
        builder.Property(x => x.Version).IsRowVersion();

        builder.HasOne(x => x.Shift)
               .WithMany(s => s.Employees)
               .HasForeignKey(x => x.ShiftId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.Project)
               .WithMany(p => p.Employees)
               .HasForeignKey(x => x.ProjectId)
               .IsRequired(false)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
