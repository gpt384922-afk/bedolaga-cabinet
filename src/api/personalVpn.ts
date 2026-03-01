import apiClient from './client';

export interface PersonalVpnNodeStatus {
  id: string;
  name: string | null;
  online: boolean;
  is_disabled: boolean | null;
}

export interface PersonalVpnSubUser {
  id: number;
  remnawave_user_id: string;
  expires_at: string;
  device_limit: number;
  traffic_limit_bytes: number;
  traffic_limit_gb: number;
  status: string;
  traffic_used_bytes: number;
  traffic_used_gb: number;
  devices_used: number;
  subscription_link: string | null;
  created_at: string;
}

export interface PersonalVpnOverview {
  has_instance: boolean;
  instance_id?: number;
  status?: string;
  expires_at?: string;
  max_users?: number;
  current_user_count?: number;
  restart_cooldown_remaining_seconds?: number;
  last_restart_at?: string | null;
  node?: PersonalVpnNodeStatus | null;
  sub_users?: PersonalVpnSubUser[];
}

export interface PersonalVpnAssignRequest {
  owner_user_id?: number;
  owner_username?: string;
  owner_telegram_id?: number;
  remnawave_node_id: string;
  remnawave_squad_id: string;
  expires_at: string;
  max_users: number;
}

export interface PersonalVpnInstance {
  id: number;
  owner_user_id: number;
  remnawave_node_id: string;
  remnawave_squad_id: string;
  expires_at: string;
  status: string;
  max_users: number;
  last_restart_at: string | null;
  created_at: string;
  updated_at: string;
}

export const personalVpnApi = {
  getOverview: async (): Promise<PersonalVpnOverview> => {
    const response = await apiClient.get('/cabinet/personal_vpn');
    return response.data;
  },

  restartNode: async (): Promise<{ success: boolean; last_restart_at: string }> => {
    const response = await apiClient.post('/cabinet/personal_vpn/restart');
    return response.data;
  },

  createSubUser: async (payload: {
    expires_at: string;
    device_limit: number;
    traffic_limit_gb: number;
  }): Promise<{ success: boolean; sub_user: PersonalVpnSubUser }> => {
    const response = await apiClient.post('/cabinet/personal_vpn/users', payload);
    return response.data;
  },

  deleteSubUser: async (subUserId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/cabinet/personal_vpn/users/${subUserId}`);
    return response.data;
  },

  getAdminNodes: async (): Promise<{ items: Array<Record<string, unknown>>; total: number }> => {
    const response = await apiClient.get('/cabinet/admin/personal_vpn/nodes');
    return response.data;
  },

  getAdminSquads: async (): Promise<{ items: Array<Record<string, unknown>>; total: number }> => {
    const response = await apiClient.get('/cabinet/admin/personal_vpn/squads');
    return response.data;
  },

  assignInstance: async (payload: PersonalVpnAssignRequest): Promise<PersonalVpnInstance> => {
    const response = await apiClient.post('/cabinet/admin/personal_vpn/assign', payload);
    return response.data;
  },

  updateInstance: async (
    instanceId: number,
    payload: { expires_at?: string; max_users?: number },
  ): Promise<PersonalVpnInstance> => {
    const response = await apiClient.patch(`/cabinet/admin/personal_vpn/${instanceId}`, payload);
    return response.data;
  },
};

