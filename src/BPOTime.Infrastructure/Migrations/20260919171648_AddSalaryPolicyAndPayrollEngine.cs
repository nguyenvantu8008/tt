using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BPOTime.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSalaryPolicyAndPayrollEngine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PayrollPeriods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    PeriodCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    TotalGrossPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalNetPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalEmployees = table.Column<int>(type: "integer", nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true),
                    LockedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollPeriods", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PayrollSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StandardHoursPerDay = table.Column<double>(type: "double precision", nullable: false),
                    StandardWorkDaysPerMonth = table.Column<double>(type: "double precision", nullable: false),
                    OtNormalDayMultiplier = table.Column<double>(type: "double precision", nullable: false),
                    OtWeekendMultiplier = table.Column<double>(type: "double precision", nullable: false),
                    OtHolidayMultiplier = table.Column<double>(type: "double precision", nullable: false),
                    SocialInsuranceEmployeeRate = table.Column<double>(type: "double precision", nullable: false),
                    SocialInsuranceEmployerRate = table.Column<double>(type: "double precision", nullable: false),
                    RoundingMethod = table.Column<int>(type: "integer", nullable: false),
                    RoundingPrecision = table.Column<int>(type: "integer", nullable: false),
                    Currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SalaryPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalaryType = table.Column<int>(type: "integer", nullable: false),
                    HourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DailyAttendanceRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DailyCalendarRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    MonthlySalary = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    StandardHoursPerDay = table.Column<double>(type: "double precision", nullable: false),
                    StandardWorkDaysPerMonth = table.Column<double>(type: "double precision", nullable: false),
                    ProrationMethod = table.Column<int>(type: "integer", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalaryPolicies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalaryPolicies_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PayrollRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayrollPeriodId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    SalaryPolicyId = table.Column<Guid>(type: "uuid", nullable: true),
                    SalaryType = table.Column<int>(type: "integer", nullable: false),
                    RateUnit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    StandardHoursPerDay = table.Column<double>(type: "double precision", nullable: false),
                    StandardWorkDaysPerMonth = table.Column<double>(type: "double precision", nullable: false),
                    WorkedHours = table.Column<double>(type: "double precision", nullable: false),
                    AttendanceUnits = table.Column<double>(type: "double precision", nullable: false),
                    ValidWorkDays = table.Column<int>(type: "integer", nullable: false),
                    BasePay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OtHours = table.Column<double>(type: "double precision", nullable: false),
                    OtBaseHourlyRate = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    OtPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Bonus = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Allowance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Advance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Deduction = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    InsuranceDeduction = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    GrossPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetPay = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    IsAnomaly = table.Column<bool>(type: "boolean", nullable: false),
                    AnomalyReason = table.Column<string>(type: "text", nullable: true),
                    BreakdownJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PayrollRecords_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PayrollRecords_PayrollPeriods_PayrollPeriodId",
                        column: x => x.PayrollPeriodId,
                        principalTable: "PayrollPeriods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PayrollRecords_SalaryPolicies_SalaryPolicyId",
                        column: x => x.SalaryPolicyId,
                        principalTable: "SalaryPolicies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PayrollPeriods_PeriodCode",
                table: "PayrollPeriods",
                column: "PeriodCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PayrollPeriods_Year_Month",
                table: "PayrollPeriods",
                columns: new[] { "Year", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_PayrollRecords_EmployeeId",
                table: "PayrollRecords",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollRecords_PayrollPeriodId_EmployeeId",
                table: "PayrollRecords",
                columns: new[] { "PayrollPeriodId", "EmployeeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PayrollRecords_SalaryPolicyId",
                table: "PayrollRecords",
                column: "SalaryPolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_SalaryPolicies_EmployeeId_EffectiveFrom",
                table: "SalaryPolicies",
                columns: new[] { "EmployeeId", "EffectiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_SalaryPolicies_EmployeeId_IsActive",
                table: "SalaryPolicies",
                columns: new[] { "EmployeeId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PayrollRecords");

            migrationBuilder.DropTable(
                name: "PayrollSettings");

            migrationBuilder.DropTable(
                name: "PayrollPeriods");

            migrationBuilder.DropTable(
                name: "SalaryPolicies");
        }
    }
}
