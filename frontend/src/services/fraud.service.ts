import api from './api';
import type { GetFraudFlagsResponse, FraudFlagRecord } from '@/types/admin';

export const fraudService = {
  async getFraudFlags(params?: { page?: number; limit?: number; status?: string }): Promise<GetFraudFlagsResponse> {
    const { data } = await api.get('/admin/fraud-flags', { params });
    return data;
  },

  async reviewFraudFlag(
    id: string,
    payload: { status: 'approved' | 'rejected'; reviewNote?: string; lockAccount?: boolean },
  ): Promise<FraudFlagRecord> {
    const { data } = await api.patch(`/admin/fraud-flags/${id}/review`, payload);
    return data;
  },
};
