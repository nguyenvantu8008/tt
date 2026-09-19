/**
 * BPOTime Client Telemetry & Error Logging
 * Bắt lỗi từ browser / smartphone của nhân viên và tự động ghi về server
 */

export interface ClientErrorPayload {
  device?: string;
  errorType: string;
  message: string;
  details?: string;
  path?: string;
  timestamp?: string;
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  const platform = /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
    ? 'Android'
    : /Windows/i.test(ua)
    ? 'Windows'
    : /Mac/i.test(ua)
    ? 'MacOS'
    : 'Unknown';

  const mode = isPWA ? 'PWA-App' : 'Browser';
  return `${platform} (${mode}) - ${navigator.userAgent.slice(0, 80)}`;
}

export async function logClientError(
  errorType: string,
  message: string,
  details?: string,
  path?: string
): Promise<void> {
  const payload: ClientErrorPayload = {
    device: getDeviceInfo(),
    errorType,
    message,
    details: details || 'No additional details',
    path: path || window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  try {
    // Gửi ngầm tới backend API
    await fetch('/api/logs/client-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Lưu vào localStorage nếu mất mạng để có thể retry sau
    console.warn('[BPOTime Telemetry] Could not send log to server, saving offline:', err);
    try {
      const offlineLogs = JSON.parse(localStorage.getItem('bpotime_offline_logs') || '[]');
      offlineLogs.push(payload);
      if (offlineLogs.length > 50) offlineLogs.shift();
      localStorage.setItem('bpotime_offline_logs', JSON.stringify(offlineLogs));
    } catch {
      // ignore
    }
  }
}

/**
 * Tự động đăng ký global listener bắt crash và unhandled rejection
 */
export function initClientErrorTelemetry(): void {
  if (typeof window === 'undefined') return;

  // Lắng nghe uncaught exceptions
  window.addEventListener('error', (event) => {
    logClientError(
      'UNCAUGHT_JS_EXCEPTION',
      event.message || 'Script error',
      `${event.filename}:${event.lineno}:${event.colno} - Stack: ${event.error?.stack || 'N/A'}`
    );
  });

  // Lắng nghe unhandled promises (async errors)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason) || 'Unhandled Promise Rejection';
    const stack = reason?.stack || 'No stack trace';
    logClientError('UNHANDLED_PROMISE_REJECTION', msg, stack);
  });

  // Khi có mạng lại, flush các log offline
  window.addEventListener('online', async () => {
    try {
      const raw = localStorage.getItem('bpotime_offline_logs');
      if (!raw) return;
      const offlineLogs: ClientErrorPayload[] = JSON.parse(raw);
      if (offlineLogs.length === 0) return;

      for (const log of offlineLogs) {
        await fetch('/api/logs/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
        });
      }
      localStorage.removeItem('bpotime_offline_logs');
    } catch {
      // ignore
    }
  });
}
