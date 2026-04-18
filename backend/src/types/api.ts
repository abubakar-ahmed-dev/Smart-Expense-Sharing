export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}
