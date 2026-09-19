namespace BPOTime.Domain.Enums;

public enum SalaryType
{
    Hourly = 1,          // Theo giờ (VNĐ / giờ)
    DailyAttendance = 2, // Theo công (VNĐ / công)
    DailyCalendar = 3,   // Theo ngày (VNĐ / ngày)
    Monthly = 4          // Theo tháng (VNĐ / tháng)
}

public enum MonthlyProrationMethod
{
    StandardWorkDays = 1, // Theo số công chuẩn (Mặc định: Lương / 26 * Công thực tế)
    CalendarDays = 2,     // Theo số ngày lịch trong tháng
    None = 3              // Không giảm trừ (Giữ nguyên lương trần)
}

public enum PayrollPeriodStatus
{
    Draft = 1,
    Calculated = 2,
    Approved = 3,
    Locked = 4
}

public enum RoundingMethod
{
    Nearest = 1,
    Floor = 2,
    Ceiling = 3
}
