/**
 * BPOTime Geolocation & Geofencing Utilities
 * Công thức trắc địa Haversine và tương tác GPS phần cứng điện thoại
 */

import { logClientError } from './clientLogger.ts';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // mét
  timestamp: number;
}

export interface GpsResult {
  coords?: GpsCoordinates;
  error?: string;
  errorCode?: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

/**
 * Lấy tọa độ GPS với cơ chế 2 lớp: Độ chính xác cao (GPS Satellites) và dự phòng (Network/Wi-Fi Triangulation)
 */
export async function getCurrentGpsPosition(): Promise<GpsResult> {
  if (!navigator.geolocation) {
    const errorMsg = 'Thiết bị hoặc trình duyệt này không hỗ trợ định vị GPS.';
    await logClientError('GPS_NOT_SUPPORTED', errorMsg, navigator.userAgent);
    return {
      error: errorMsg,
      errorCode: 'NOT_SUPPORTED',
    };
  }

  const tryGetPosition = (highAccuracy: boolean, timeoutMs: number): Promise<GpsResult> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy),
              timestamp: pos.timestamp,
            },
          });
        },
        (err) => {
          let code: GpsResult['errorCode'] = 'UNKNOWN';
          let userMessage = 'Không thể lấy vị trí GPS.';

          switch (err.code) {
            case err.PERMISSION_DENIED:
              code = 'PERMISSION_DENIED';
              userMessage =
                'Bạn chưa cấp quyền truy cập Vị trí (GPS). Vui lòng nhấn vào biểu tượng ổ khóa hoặc cài đặt trình duyệt để cấp quyền vị trí.';
              break;
            case err.POSITION_UNAVAILABLE:
              code = 'POSITION_UNAVAILABLE';
              userMessage =
                'Không bắt được tín hiệu vệ tinh GPS. Vui lòng kiểm tra lại kết nối di động hoặc di chuyển ra khu vực thoáng.';
              break;
            case err.TIMEOUT:
              code = 'TIMEOUT';
              userMessage = 'Thời gian quét GPS hết hạn.';
              break;
          }

          resolve({
            error: userMessage,
            errorCode: code,
          });
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 10000,
        }
      );
    });
  };

  // Lần 1: Thử GPS vệ tinh độ chính xác cao (8 giây)
  let result = await tryGetPosition(true, 8000);
  if (result.coords) return result;

  // Nếu người dùng từ chối quyền truy cập, không cần thử lại
  if (result.errorCode === 'PERMISSION_DENIED') {
    await logClientError('GPS_PERMISSION_DENIED', result.error || '', navigator.userAgent);
    return result;
  }

  // Lần 2: Thử chế độ mạng Cellular/Wi-Fi thông thường nếu lần 1 timeout hoặc lỗi phần cứng
  result = await tryGetPosition(false, 6000);
  if (result.coords) return result;

  // Ghi log chỉ khi cả 2 chế độ đều thất bại
  await logClientError(
    `GPS_${result.errorCode || 'ERROR'}`,
    result.error || 'Lỗi quét GPS',
    `Navigator: ${navigator.userAgent}`
  );

  return result;
}

/**
 * Tính khoảng cách đường chim bay giữa 2 tọa độ theo công thức Haversine (đơn vị: mét)
 */
export function calcDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Bán kính trái đất (mét)
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
