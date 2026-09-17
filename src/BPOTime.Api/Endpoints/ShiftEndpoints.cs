using BPOTime.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BPOTime.Api.Endpoints;

public static class ShiftEndpoints
{
    public static void MapShiftEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shifts").WithTags("Shifts");

        group.MapGet("/", async (ApplicationDbContext db) =>
        {
            var shifts = await db.Shifts
                .OrderBy(s => s.StartTime)
                .Select(s => new
                {
                    s.Id,
                    s.Code,
                    s.Name,
                    StartTime = s.StartTime.ToString(@"hh\:mm"),
                    EndTime = s.EndTime.ToString(@"hh\:mm"),
                    s.BreakTime,
                    s.TotalHours
                })
                .ToListAsync();

            return Results.Ok(shifts);
        });
    }
}
