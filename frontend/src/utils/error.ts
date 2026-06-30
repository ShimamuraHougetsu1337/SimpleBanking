import axios from 'axios';

export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';

  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    if (data.details && Array.isArray(data.details)) {
      return data.details.map((d: any) => d.message).join(' | ');
    }
    const msg = data.message;
    if (msg) return Array.isArray(msg) ? msg.join(', ') : msg;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'A network error occurred, please try again';
}
