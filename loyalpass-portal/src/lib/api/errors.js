export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(
    error?.message || 'Unexpected API error',
    error?.status || 500,
    error?.details || null
  );
}
