using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace BPOTime.Api.Endpoints;

public static class GeoEndpoints
{
    public static void MapGeoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/geo").WithTags("Geocoding & Maps");

        group.MapGet("/lookup", async (
            [FromQuery] string query,
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("GeoEndpoints");

            if (string.IsNullOrWhiteSpace(query))
            {
                return Results.BadRequest(new { message = "Vui lòng nhập địa chỉ, tọa độ hoặc link Google Maps." });
            }

            query = query.Trim();

            // 1. Kiểm tra nếu query là liên kết Google Maps hoặc chuỗi tọa độ (Lat, Lng)
            // Ví dụ: https://www.google.com/maps/place/.../@10.771918,106.698347,17z
            // hoặc https://www.google.com/maps?q=10.771918,106.698347
            // hoặc 10.771918, 106.698347
            var coordRegex = new Regex(@"(?:@|\?q=|ll=|loc:)?(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)");
            var match = coordRegex.Match(query);
            if (match.Success)
            {
                if (double.TryParse(match.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture, out var lat) &&
                    double.TryParse(match.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture, out var lng))
                {
                    return Results.Ok(new
                    {
                        found = true,
                        latitude = lat,
                        longitude = lng,
                        formattedAddress = $"Tọa độ từ liên kết Google Maps ({lat:F6}, {lng:F6})",
                        source = "coordinates_or_map_url"
                    });
                }
            }

            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("User-Agent", "BPOTime-AttendanceApp/1.0 (contact@bpotime.vn)");

            // 2. Nếu có cấu hình Google Maps API Key
            var googleApiKey = config["GoogleMaps:ApiKey"] ?? Environment.GetEnvironmentVariable("GOOGLE_MAPS_API_KEY");
            if (!string.IsNullOrWhiteSpace(googleApiKey))
            {
                try
                {
                    var googleUrl = $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(query)}&key={googleApiKey}&language=vi";
                    var googleResp = await client.GetAsync(googleUrl);
                    if (googleResp.IsSuccessStatusCode)
                    {
                        var json = await googleResp.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(json);
                        var status = doc.RootElement.GetProperty("status").GetString();
                        if (status == "OK")
                        {
                            var results = doc.RootElement.GetProperty("results");
                            if (results.GetArrayLength() > 0)
                            {
                                var first = results[0];
                                var loc = first.GetProperty("geometry").GetProperty("location");
                                var gLat = loc.GetProperty("lat").GetDouble();
                                var gLng = loc.GetProperty("lng").GetDouble();
                                var gAddr = first.GetProperty("formatted_address").GetString();

                                return Results.Ok(new
                                {
                                    found = true,
                                    latitude = gLat,
                                    longitude = gLng,
                                    formattedAddress = gAddr,
                                    source = "google_maps_api"
                                });
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Lỗi gọi Google Maps Geocoding API, chuyển sang OpenStreetMap Nominatim dự phòng.");
                }
            }

            // 3. Sử dụng OpenStreetMap Nominatim Geocoding API (Miễn phí, chính xác tại Việt Nam, không cần API Key)
            try
            {
                var nominatimUrl = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&addressdetails=1&limit=5&countrycodes=vn";
                var nomResp = await client.GetAsync(nominatimUrl);
                if (nomResp.IsSuccessStatusCode)
                {
                    var json = await nomResp.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                    {
                        var first = doc.RootElement[0];
                        var latStr = first.GetProperty("lat").GetString();
                        var lonStr = first.GetProperty("lon").GetString();
                        var displayName = first.GetProperty("display_name").GetString();

                        if (double.TryParse(latStr, System.Globalization.CultureInfo.InvariantCulture, out var nLat) &&
                            double.TryParse(lonStr, System.Globalization.CultureInfo.InvariantCulture, out var nLng))
                        {
                            return Results.Ok(new
                            {
                                found = true,
                                latitude = nLat,
                                longitude = nLng,
                                formattedAddress = displayName,
                                source = "openstreetmap_nominatim"
                            });
                        }
                    }
                }

                // Nếu tìm với countrycodes=vn không thấy, thử tìm toàn cầu
                var globalUrl = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(query)}&format=json&addressdetails=1&limit=3";
                var globResp = await client.GetAsync(globalUrl);
                if (globResp.IsSuccessStatusCode)
                {
                    var globJson = await globResp.Content.ReadAsStringAsync();
                    using var globDoc = JsonDocument.Parse(globJson);
                    if (globDoc.RootElement.ValueKind == JsonValueKind.Array && globDoc.RootElement.GetArrayLength() > 0)
                    {
                        var first = globDoc.RootElement[0];
                        var latStr = first.GetProperty("lat").GetString();
                        var lonStr = first.GetProperty("lon").GetString();
                        var displayName = first.GetProperty("display_name").GetString();

                        if (double.TryParse(latStr, System.Globalization.CultureInfo.InvariantCulture, out var nLat) &&
                            double.TryParse(lonStr, System.Globalization.CultureInfo.InvariantCulture, out var nLng))
                        {
                            return Results.Ok(new
                            {
                                found = true,
                                latitude = nLat,
                                longitude = nLng,
                                formattedAddress = displayName,
                                source = "openstreetmap_nominatim_global"
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi tra cứu địa chỉ từ Nominatim Geocoding.");
            }

            return Results.Ok(new
            {
                found = false,
                message = "Không tìm thấy tọa độ cho địa chỉ này. Bạn có thể dán liên kết Google Maps hoặc tọa độ Lat, Lng trực tiếp."
            });
        });
    }
}
