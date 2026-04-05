import axios from 'axios';

export function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const errors = err.response?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) return String(errors[0]);
  }
  return fallback;
}
