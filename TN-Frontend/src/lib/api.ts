import Cookies from 'js-cookie';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // Trong trình duyệt, ưu tiên gọi qua Next.js proxy rewrite /api để tránh CORS/PNA
    return '/api';
  }
  const internalUrl = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
  return `${internalUrl}/api`;
};

class ApiClient {
  private getHeaders(isMultipart = false) {
    const headers: HeadersInit = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    const token = Cookies.get('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      const errorObj = new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage) as any;
      errorObj.statusCode = response.status;
      if (data && typeof data === 'object') {
        Object.assign(errorObj, data);
      }
      throw errorObj;
    }

    return data;
  }

  async get(endpoint: string) {
    const headers: HeadersInit = {};
    const token = Cookies.get('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getBaseUrl();
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
      });
      return await this.handleResponse(response);
    } catch (err: any) {
      // Fallback tự động nếu gặp lỗi mạng (TypeError: Failed to fetch)
      if (err instanceof TypeError && typeof window !== 'undefined') {
        const fallbackBase = baseUrl === '/api'
          ? `${window.location.protocol}//${window.location.hostname}:5000/api`
          : '/api';
        try {
          const fallbackResponse = await fetch(`${fallbackBase}${endpoint}`, {
            method: 'GET',
            headers,
          });
          return await this.handleResponse(fallbackResponse);
        } catch {
          // Bỏ qua lỗi fallback, ném ra lỗi gốc
        }
      }
      throw err;
    }
  }

  async post(endpoint: string, body: FormData | unknown = {}, isMultipart = false) {
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(isMultipart),
      body: isMultipart ? (body as FormData) : JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async put(endpoint: string, body: unknown = {}) {
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async patch(endpoint: string, body: unknown = {}) {
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  async delete(endpoint: string, body?: any) {
    const options: RequestInit = {
      method: 'DELETE',
      headers: this.getHeaders(),
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${getBaseUrl()}${endpoint}`, options);
    return this.handleResponse(response);
  }

  /**
   * Tải file nhị phân (.xlsx, .pdf, ...) kèm JWT Authorization header qua Next.js proxy /api.
   * Tự động đọc lỗi JSON nếu server trả về lỗi và trích xuất tên file chuẩn từ Content-Disposition.
   */
  async download(endpoint: string, fallbackFilename = 'export.xlsx'): Promise<string> {
    const headers: HeadersInit = {};
    const token = Cookies.get('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (response.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.message || `Không thể tải file (Mã lỗi ${response.status}).`);
    }

    // Trích xuất tên file từ header Content-Disposition nếu có
    let filename = fallbackFilename;
    const disposition = response.headers.get('Content-Disposition');
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
      if (utf8Match && utf8Match[1]) {
        filename = decodeURIComponent(utf8Match[1].trim());
      } else {
        const simpleMatch = disposition.match(/filename="?([^";\n]+)"?/i);
        if (simpleMatch && simpleMatch[1]) {
          filename = simpleMatch[1].trim();
        }
      }
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('File xuất ra bị trống. Vui lòng thử lại.');
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);

    return filename;
  }
}

export const api = new ApiClient();
export default api;
