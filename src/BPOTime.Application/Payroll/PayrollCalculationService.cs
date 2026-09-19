using System.Text.Json;
using BPOTime.Domain.Entities;
using BPOTime.Domain.Enums;

namespace BPOTime.Application.Payroll;

public class PayrollCalculationService : IPayrollCalculationService
{
    public PayrollCalculationResult CalculateEmployee(
        Employee employee,
        SalaryPolicy? policy,
        PayrollSetting setting,
        List<Attendance> attendances,
        int daysInMonth,
        decimal bonus = 0,
        decimal allowance = 0,
        decimal advance = 0,
        decimal deduction = 0)
    {
        var result = new PayrollCalculationResult
        {
            EmployeeId = employee.Id,
            EmployeeCode = employee.Code,
            EmployeeName = employee.FullName,
            Department = employee.Department,
            Position = employee.Position,
            ProjectCode = employee.Project?.Code ?? "BPO",
            Bonus = bonus,
            Allowance = allowance,
            Advance = advance,
            Deduction = deduction
        };

        // 1. Check if SalaryPolicy exists
        if (policy == null)
        {
            result.IsAnomaly = true;
            result.AnomalyReason = "Chưa thiết lập Phương thức tính lương (Salary Policy)";
            result.SalaryTypeName = "Chưa cấu hình";
            result.BreakdownLines.Add("LỖI: Nhân viên chưa được cấu hình Chính sách lương.");
            result.BreakdownJson = JsonSerializer.Serialize(result.BreakdownLines);
            return result;
        }

        result.SalaryPolicyId = policy.Id;
        result.SalaryType = policy.SalaryType;
        result.StandardHoursPerDay = policy.StandardHoursPerDay > 0 ? policy.StandardHoursPerDay : setting.StandardHoursPerDay;
        result.StandardWorkDaysPerMonth = policy.StandardWorkDaysPerMonth > 0 ? policy.StandardWorkDaysPerMonth : setting.StandardWorkDaysPerMonth;
        result.RateUnit = policy.GetPrimaryRate();
        result.OtMultiplier = setting.OtNormalDayMultiplier;

        // 2. Validate Rate Unit
        if (result.RateUnit <= 0)
        {
            result.IsAnomaly = true;
            result.AnomalyReason = $"Mức lương đơn giá chưa hợp lệ (0 VNĐ)";
        }

        // 3. Aggregate Attendance Metrics
        double totalWorkedHours = 0;
        double totalAttendanceUnits = 0;
        double totalOtHours = 0;
        var validDates = new HashSet<DateOnly>();

        foreach (var att in attendances)
        {
            totalWorkedHours += att.WorkedHours;
            totalOtHours += att.OtHours;

            // Attendance units: 8h = 1.0; 4h = 0.5; etc.
            double units = 0;
            if (att.Status == AttendanceStatus.HalfDay)
            {
                units = 0.5;
            }
            else if (att.WorkedHours >= result.StandardHoursPerDay)
            {
                units = 1.0;
            }
            else if (att.WorkedHours > 0)
            {
                units = Math.Round(att.WorkedHours / result.StandardHoursPerDay, 2);
            }
            totalAttendanceUnits += units;

            // Distinct valid working days (any day with attendance not absent/off)
            if (att.Status != AttendanceStatus.Absent && att.Status != AttendanceStatus.Off && att.WorkedHours > 0)
            {
                validDates.Add(att.Date);
            }
        }

        result.WorkedHours = totalWorkedHours;
        result.AttendanceUnits = Math.Round(totalAttendanceUnits, 2);
        result.ValidWorkDays = validDates.Count;
        result.OtHours = totalOtHours;

        // 4. Calculate Base Pay & OT Base Hourly Rate based on SalaryType
        var breakdown = new List<string>();

        switch (policy.SalaryType)
        {
            case SalaryType.Hourly:
                result.SalaryTypeName = "Theo giờ";
                result.BasePay = Math.Round((decimal)result.WorkedHours * result.RateUnit, MidpointRounding.AwayFromZero);
                result.OtBaseHourlyRate = result.RateUnit;
                breakdown.Add($"[PHƯƠNG THỨC: THEO GIỜ] Đơn giá: {result.RateUnit:N0} đ/giờ");
                breakdown.Add($"Lương cơ bản = {result.WorkedHours:N1} giờ × {result.RateUnit:N0} đ = {result.BasePay:N0} đ");
                break;

            case SalaryType.DailyAttendance:
                result.SalaryTypeName = "Theo công";
                result.BasePay = Math.Round((decimal)result.AttendanceUnits * result.RateUnit, MidpointRounding.AwayFromZero);
                result.OtBaseHourlyRate = result.StandardHoursPerDay > 0 
                    ? Math.Round(result.RateUnit / (decimal)result.StandardHoursPerDay, 2) 
                    : 0;
                breakdown.Add($"[PHƯƠNG THỨC: THEO CÔNG] Đơn giá: {result.RateUnit:N0} đ/công (Công chuẩn: {result.StandardHoursPerDay}h)");
                breakdown.Add($"Lương cơ bản = {result.AttendanceUnits:N2} công × {result.RateUnit:N0} đ = {result.BasePay:N0} đ");
                break;

            case SalaryType.DailyCalendar:
                result.SalaryTypeName = "Theo ngày";
                result.BasePay = Math.Round((decimal)result.ValidWorkDays * result.RateUnit, MidpointRounding.AwayFromZero);
                result.OtBaseHourlyRate = result.StandardHoursPerDay > 0 
                    ? Math.Round(result.RateUnit / (decimal)result.StandardHoursPerDay, 2) 
                    : 0;
                breakdown.Add($"[PHƯƠNG THỨC: THEO NGÀY] Đơn giá: {result.RateUnit:N0} đ/ngày");
                breakdown.Add($"Lương cơ bản = {result.ValidWorkDays} ngày hợp lệ × {result.RateUnit:N0} đ = {result.BasePay:N0} đ");
                break;

            case SalaryType.Monthly:
                result.SalaryTypeName = "Theo tháng";
                var monthlySalary = result.RateUnit;
                var standardDays = (decimal)result.StandardWorkDaysPerMonth;

                if (policy.ProrationMethod == MonthlyProrationMethod.StandardWorkDays && standardDays > 0)
                {
                    var actualUnits = (decimal)result.AttendanceUnits;
                    if (actualUnits >= standardDays)
                    {
                        result.BasePay = monthlySalary;
                        breakdown.Add($"[PHƯƠNG THỨC: THEO THÁNG] Đủ công chuẩn ({actualUnits:N1}/{standardDays:N0} công) -> Lương trần = {result.BasePay:N0} đ");
                    }
                    else
                    {
                        result.BasePay = Math.Round((monthlySalary / standardDays) * actualUnits, MidpointRounding.AwayFromZero);
                        breakdown.Add($"[PHƯƠNG THỨC: THEO THÁNG] Prorate theo công: ({monthlySalary:N0} đ / {standardDays:N0} công) × {actualUnits:N2} công = {result.BasePay:N0} đ");
                    }
                }
                else if (policy.ProrationMethod == MonthlyProrationMethod.CalendarDays && daysInMonth > 0)
                {
                    result.BasePay = Math.Round((monthlySalary / daysInMonth) * result.ValidWorkDays, MidpointRounding.AwayFromZero);
                    breakdown.Add($"[PHƯƠNG THỨC: THEO THÁNG] Prorate ngày lịch: ({monthlySalary:N0} đ / {daysInMonth} ngày) × {result.ValidWorkDays} ngày = {result.BasePay:N0} đ");
                }
                else
                {
                    result.BasePay = monthlySalary;
                    breakdown.Add($"[PHƯƠNG THỨC: THEO THÁNG] Cố định không giảm trừ = {result.BasePay:N0} đ");
                }

                // OT Base hourly rate for monthly: MonthlySalary / StandardWorkDays / StandardHours
                if (standardDays > 0 && result.StandardHoursPerDay > 0)
                {
                    result.OtBaseHourlyRate = Math.Round(monthlySalary / standardDays / (decimal)result.StandardHoursPerDay, 2);
                }
                break;
        }

        // 5. Overtime Calculation
        if (result.OtHours > 0 && result.OtBaseHourlyRate > 0)
        {
            result.OtPay = Math.Round((decimal)result.OtHours * result.OtBaseHourlyRate * (decimal)result.OtMultiplier, MidpointRounding.AwayFromZero);
            breakdown.Add($"Tăng ca (OT): {result.OtHours:N1}h × {result.OtBaseHourlyRate:N0} đ/h × {result.OtMultiplier}x = {result.OtPay:N0} đ");
        }
        else
        {
            result.OtPay = 0;
        }

        // 6. Insurance & Deductions (Configurable via PayrollSetting)
        if (setting.SocialInsuranceEmployeeRate > 0)
        {
            result.InsuranceDeduction = Math.Round(result.BasePay * (decimal)setting.SocialInsuranceEmployeeRate, MidpointRounding.AwayFromZero);
            breakdown.Add($"Bảo hiểm Xã hội/Y tế ({(setting.SocialInsuranceEmployeeRate * 100):N1}%): -{result.InsuranceDeduction:N0} đ");
        }

        if (bonus > 0) breakdown.Add($"Khen thưởng: +{bonus:N0} đ");
        if (allowance > 0) breakdown.Add($"Phụ cấp: +{allowance:N0} đ");
        if (advance > 0) breakdown.Add($"Tạm ứng: -{advance:N0} đ");
        if (deduction > 0) breakdown.Add($"Khấu trừ khác: -{deduction:N0} đ");

        // 7. Gross & Net Pay
        result.GrossPay = result.BasePay + result.OtPay + bonus + allowance;
        result.NetPay = Math.Max(0, result.GrossPay - result.InsuranceDeduction - advance - deduction);

        breakdown.Add($"TỔNG LƯƠNG GROSS = {result.GrossPay:N0} đ");
        breakdown.Add($"THỰC LĨNH (NET PAY) = {result.NetPay:N0} đ");

        result.BreakdownLines = breakdown;
        result.BreakdownJson = JsonSerializer.Serialize(breakdown);

        // 8. Anomaly Check
        if (result.NetPay <= 0)
        {
            result.IsAnomaly = true;
            result.AnomalyReason = (result.AnomalyReason ?? "") + " [Thực lĩnh <= 0 đ]";
        }
        if (result.WorkedHours == 0 && result.BasePay == 0)
        {
            result.IsAnomaly = true;
            result.AnomalyReason = (result.AnomalyReason ?? "") + " [Không có dữ liệu công]";
        }
        if (result.OtHours > 40)
        {
            result.IsAnomaly = true;
            result.AnomalyReason = (result.AnomalyReason ?? "") + $" [Tăng ca cao: {result.OtHours}h > 40h]";
        }

        return result;
    }

    public PayrollPeriodPreviewResult CalculatePeriod(
        int month,
        int year,
        List<Employee> employees,
        List<SalaryPolicy> policies,
        PayrollSetting setting,
        List<Attendance> attendances)
    {
        var periodCode = $"{year}-{month:D2}";
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var preview = new PayrollPeriodPreviewResult
        {
            PeriodCode = periodCode,
            Month = month,
            Year = year,
            TotalEmployees = employees.Count
        };

        var periodStart = new DateOnly(year, month, 1);
        var periodEnd = new DateOnly(year, month, daysInMonth);

        foreach (var emp in employees)
        {
            // Find active policy for this period
            var empPolicy = policies
                .Where(p => p.EmployeeId == emp.Id && p.IsActive)
                .Where(p => p.EffectiveFrom <= periodEnd && (p.EffectiveTo == null || p.EffectiveTo >= periodStart))
                .OrderByDescending(p => p.EffectiveFrom)
                .FirstOrDefault();

            var empAttendances = attendances.Where(a => a.EmployeeId == emp.Id).ToList();

            var item = CalculateEmployee(emp, empPolicy, setting, empAttendances, daysInMonth);
            preview.Items.Add(item);

            if (empPolicy == null)
            {
                preview.UnconfiguredCount++;
            }
            else
            {
                switch (empPolicy.SalaryType)
                {
                    case SalaryType.Hourly: preview.HourlyCount++; break;
                    case SalaryType.DailyAttendance: preview.DailyAttendanceCount++; break;
                    case SalaryType.DailyCalendar: preview.DailyCalendarCount++; break;
                    case SalaryType.Monthly: preview.MonthlyCount++; break;
                }
            }

            if (item.IsAnomaly)
            {
                preview.AnomaliesCount++;
            }

            preview.TotalGrossPay += item.GrossPay;
            preview.TotalNetPay += item.NetPay;
        }

        return preview;
    }
}
