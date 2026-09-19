using BPOTime.Domain.Entities;

namespace BPOTime.Application.Payroll;

public interface IPayrollCalculationService
{
    PayrollCalculationResult CalculateEmployee(
        Employee employee,
        SalaryPolicy? policy,
        PayrollSetting setting,
        List<Attendance> attendances,
        int daysInMonth,
        decimal bonus = 0,
        decimal allowance = 0,
        decimal advance = 0,
        decimal deduction = 0);

    PayrollPeriodPreviewResult CalculatePeriod(
        int month,
        int year,
        List<Employee> employees,
        List<SalaryPolicy> policies,
        PayrollSetting setting,
        List<Attendance> attendances);
}
