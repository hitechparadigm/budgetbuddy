/**
 * Family API methods
 */

import { 
  Family, 
  FamilyInvitation,
  User,
  ApiResponse 
} from '@budget-buddy/shared';
import { getApiClient } from './client';

export const familyApi = {
  async createFamily(familyName: string): Promise<ApiResponse<Family>> {
    const client = getApiClient();
    return client.post<Family>('/family', { familyName });
  },

  async getFamily(): Promise<ApiResponse<Family>> {
    const client = getApiClient();
    return client.get<Family>('/family');
  },

  async updateFamily(updates: Partial<Family>): Promise<ApiResponse<Family>> {
    const client = getApiClient();
    return client.put<Family>('/family', updates);
  },

  async inviteMember(email: string): Promise<ApiResponse<FamilyInvitation>> {
    const client = getApiClient();
    return client.post<FamilyInvitation>('/family/invite', { email });
  },

  async acceptInvitation(token: string): Promise<ApiResponse<Family>> {
    const client = getApiClient();
    return client.post<Family>('/family/accept-invitation', { token });
  },

  async getFamilyMembers(): Promise<ApiResponse<User[]>> {
    const client = getApiClient();
    return client.get<User[]>('/family/members');
  },

  async removeMember(userId: string): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.delete<void>(`/family/members/${userId}`);
  },

  async updateMemberRole(userId: string, role: 'primary' | 'spouse' | 'viewer'): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.put<void>(`/family/members/${userId}/role`, { role });
  },

  async convertToFamilyAccount(familyName: string): Promise<ApiResponse<Family>> {
    const client = getApiClient();
    return client.post<Family>('/family/convert', { familyName });
  },

  async leaveFamily(): Promise<ApiResponse<void>> {
    const client = getApiClient();
    return client.post<void>('/family/leave');
  },
};