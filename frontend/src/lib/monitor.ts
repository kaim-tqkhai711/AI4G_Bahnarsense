/**
 * lib/monitor.ts
 * Module chuyên biệt cho Observability & Performance Tracking
 * - Đo lường Drop-off rate (rời bỏ trang)
 * - Đo lường Latency (Độ trễ API)
 * - Triển khai cơ chế LocalStorage Fallback khi API quá tải.
 */

// 1. Theo dõi tỉ lệ Drop-off (Thường gắn vào lúc unmount component Onboarding/Khảo sát nếu chưa hoàn thành)
export const trackEvent = (eventName: string, metadata: Record<string, unknown> = {}) => {
    // Trong môi trường thật, sẽ gửi tới Mixpanel, Google Analytics hoặc custom endpoint
    const evt = {
        event: eventName,
        timestamp: new Date().toISOString(),
        ...metadata
    };

    // Lưu tạm vào RAM/Console thay vì gửi mạng liên tục (gửi theo batch là tốt nhất)
    console.log(`[MONITOR] Event Tracked: ${eventName}`, evt);

    // Mô phỏng đẩy vào Local Storage làm nhật ký phụ
    const logs = JSON.parse(localStorage.getItem('analytics_logs') || '[]');
    logs.push(evt);
    localStorage.setItem('analytics_logs', JSON.stringify(logs.slice(-50))); // Lấy 50 log gần nhất
};

export const trackDropOff = (screenName: string, timeSpentMs: number) => {
    trackEvent('user_dropoff', { screen: screenName, timeSpentMs });
};

// 2. Fetcher có tích hợp đo độ trễ và Cache Fallback
export const fetchWithMonitor = async <T>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string,
    maxLatencyMs: number = 15000 // Sau 15s nếu không phản hồi thì ép lấy cache hoặc ném lỗi (render free tier wake up có thể chậm)
): Promise<T> => {
    const startTime = performance.now();
    // Tính năng Fail-safe/Fallback
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error('TIMEOUT_LATENCY_EXCEEDED: Máy chủ đang khởi động hoặc quá tải, vui lòng thử lại sau giây lát.'));
        }, maxLatencyMs);
    });

    try {
        // Cuộc đua giữa việc mạng fetch xong vs Timeout
        const response = await Promise.race([
            fetch(url, options),
            timeoutPromise
        ]) as Response;

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        const latency = Math.round(performance.now() - startTime);

        trackEvent('api_latency', { url: new URL(url, window.location.href).pathname, latencyMs: latency, status: 'success' });

        // Cập nhật Cache nếu request thành công
        if (cacheKey) {
            localStorage.setItem(`api_cache_${cacheKey}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        }

        return data;
    } catch (error: unknown) {
        const latency = Math.round(performance.now() - startTime);
        const errorMessage = error instanceof Error ? error.message : String(error);
        trackEvent('api_latency', { url: new URL(url, window.location.href).pathname, latencyMs: latency, status: 'failed', error: errorMessage });

        // Chiến lược Fallback (Truy xuất Local Storage)
        if (cacheKey) {
            const cachedValue = localStorage.getItem(`api_cache_${cacheKey}`);
            if (cachedValue) {
                console.warn(`[MONITOR] ⚠️ API ${url} bị lỗi/chậm (${latency}ms). Đang dùng dữ liệu từ LocalStorage.`);
                const parsed = JSON.parse(cachedValue);
                // Có thể check thêm hạn sử dụng cache ở đây
                return parsed.data;
            }
        }

        // Nếu không có cache, bốc lỗi lên chặn UI
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(String(error));
        }
    }
};
