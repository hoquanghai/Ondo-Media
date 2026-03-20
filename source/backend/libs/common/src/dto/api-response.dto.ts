export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  timestamp: string;

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    const res = new ApiResponseDto<T>();
    res.success = true;
    res.data = data;
    res.message = message ?? 'OK';
    res.timestamp = new Date().toISOString();
    return res;
  }

  static fail(message: string, errorCode?: string): ApiResponseDto<null> {
    const res = new ApiResponseDto<null>();
    res.success = false;
    res.message = message;
    res.errorCode = errorCode;
    res.timestamp = new Date().toISOString();
    return res;
  }
}
