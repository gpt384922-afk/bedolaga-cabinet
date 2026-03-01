import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { personalVpnApi, PersonalVpnAssignRequest, PersonalVpnInstance } from '../api/personalVpn';
import { AdminBackButton } from '../components/admin';

const errorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail?.message) return detail.message;
  }
  if (error instanceof Error) return error.message;
  return 'Ошибка запроса';
};

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

interface SelectOption {
  id: string;
  title: string;
  subtitle?: string;
}

export default function AdminPersonalVpn() {
  const [ownerMode, setOwnerMode] = useState<'id' | 'username' | 'telegram'>('id');
  const [ownerValue, setOwnerValue] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [squadId, setSquadId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUsers, setMaxUsers] = useState(3);

  const [updateInstanceId, setUpdateInstanceId] = useState('');
  const [updateExpiresAt, setUpdateExpiresAt] = useState('');
  const [updateMaxUsers, setUpdateMaxUsers] = useState('');

  const [created, setCreated] = useState<PersonalVpnInstance | null>(null);

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ['admin-personal-vpn-nodes'],
    queryFn: personalVpnApi.getAdminNodes,
  });

  const { data: squadsData, isLoading: squadsLoading } = useQuery({
    queryKey: ['admin-personal-vpn-squads'],
    queryFn: personalVpnApi.getAdminSquads,
  });

  const nodeOptions = useMemo<SelectOption[]>(() => {
    return (nodesData?.items || []).map((item) => {
      const id = asString(item.uuid ?? item.id);
      const name = asString(item.name) || id;
      const online = item.is_connected === true && item.is_disabled !== true ? 'онлайн' : 'оффлайн';
      return { id, title: name, subtitle: `${id} • ${online}` };
    });
  }, [nodesData?.items]);

  const squadOptions = useMemo<SelectOption[]>(() => {
    return (squadsData?.items || []).map((item) => {
      const id = asString(item.uuid ?? item.id);
      const name = asString(item.name) || id;
      return { id, title: name, subtitle: id };
    });
  }, [squadsData?.items]);

  const assignMutation = useMutation({
    mutationFn: personalVpnApi.assignInstance,
    onSuccess: (instance) => {
      setCreated(instance);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ instanceId, payload }: { instanceId: number; payload: { expires_at?: string; max_users?: number } }) =>
      personalVpnApi.updateInstance(instanceId, payload),
    onSuccess: (instance) => {
      setCreated(instance);
    },
  });

  const handleAssign = (e: FormEvent) => {
    e.preventDefault();

    if (!ownerValue || !nodeId || !squadId || !expiresAt) return;

    const payload: PersonalVpnAssignRequest = {
      remnawave_node_id: nodeId,
      remnawave_squad_id: squadId,
      expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      max_users: Math.max(1, maxUsers),
    };

    if (ownerMode === 'id') payload.owner_user_id = Number(ownerValue);
    if (ownerMode === 'username') payload.owner_username = ownerValue;
    if (ownerMode === 'telegram') payload.owner_telegram_id = Number(ownerValue);

    assignMutation.mutate(payload);
  };

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    const instanceId = Number(updateInstanceId);
    if (!instanceId) return;

    const payload: { expires_at?: string; max_users?: number } = {};
    if (updateExpiresAt) payload.expires_at = new Date(`${updateExpiresAt}T23:59:59`).toISOString();
    if (updateMaxUsers) payload.max_users = Math.max(1, Number(updateMaxUsers));

    if (!payload.expires_at && !payload.max_users) return;

    updateMutation.mutate({ instanceId, payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin" />
        <div>
          <h1 className="text-xl font-bold text-dark-100">Личный VPN</h1>
          <p className="text-sm text-dark-400">Ручная выдача выделенной ноды и squad пользователю</p>
        </div>
      </div>

      <form className="card space-y-4 p-5" onSubmit={handleAssign}>
        <h2 className="text-base font-semibold text-dark-100">Выдать инстанс</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-dark-500">Поиск пользователя</label>
            <select
              className="input mb-2"
              value={ownerMode}
              onChange={(e) => setOwnerMode(e.target.value as 'id' | 'username' | 'telegram')}
            >
              <option value="id">User ID</option>
              <option value="username">Telegram username</option>
              <option value="telegram">Telegram ID</option>
            </select>
            <input
              className="input"
              value={ownerValue}
              onChange={(e) => setOwnerValue(e.target.value)}
              placeholder={ownerMode === 'username' ? '@username' : 'Введите значение'}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-dark-500">Дата окончания</label>
            <input
              type="date"
              className="input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-dark-500">Нода</label>
            <select
              className="input"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              required
              disabled={nodesLoading}
            >
              <option value="">Выберите ноду</option>
              {nodeOptions.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
            {nodeId && (
              <p className="mt-1 text-xs text-dark-500">
                {nodeOptions.find((node) => node.id === nodeId)?.subtitle}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-dark-500">Squad</label>
            <select
              className="input"
              value={squadId}
              onChange={(e) => setSquadId(e.target.value)}
              required
              disabled={squadsLoading}
            >
              <option value="">Выберите squad</option>
              {squadOptions.map((squad) => (
                <option key={squad.id} value={squad.id}>
                  {squad.title}
                </option>
              ))}
            </select>
            {squadId && (
              <p className="mt-1 text-xs text-dark-500">
                {squadOptions.find((squad) => squad.id === squadId)?.subtitle}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-dark-500">MAX USERS</label>
            <input
              type="number"
              min={1}
              className="input"
              value={maxUsers}
              onChange={(e) => setMaxUsers(Math.max(1, Number(e.target.value) || 1))}
              required
            />
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={assignMutation.isPending}>
          {assignMutation.isPending ? 'Создание...' : 'Подтвердить выдачу'}
        </button>

        {assignMutation.isError && (
          <p className="text-sm text-error-400">{errorMessage(assignMutation.error)}</p>
        )}
      </form>

      <form className="card space-y-4 p-5" onSubmit={handleUpdate}>
        <h2 className="text-base font-semibold text-dark-100">Продлить / изменить лимиты</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-dark-500">Instance ID</label>
            <input
              className="input"
              value={updateInstanceId}
              onChange={(e) => setUpdateInstanceId(e.target.value)}
              placeholder="Например, 12"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">Новая дата окончания</label>
            <input
              type="date"
              className="input"
              value={updateExpiresAt}
              onChange={(e) => setUpdateExpiresAt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">Новый MAX USERS</label>
            <input
              type="number"
              min={1}
              className="input"
              value={updateMaxUsers}
              onChange={(e) => setUpdateMaxUsers(e.target.value)}
              placeholder="Оставьте пустым без изменений"
            />
          </div>
        </div>

        <button className="btn-secondary" type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
        </button>

        {updateMutation.isError && (
          <p className="text-sm text-error-400">{errorMessage(updateMutation.error)}</p>
        )}
      </form>

      {created && (
        <div className="card space-y-2 p-5 text-sm text-dark-300">
          <h3 className="text-base font-semibold text-dark-100">Последний результат</h3>
          <div>Instance ID: {created.id}</div>
          <div>Owner ID: {created.owner_user_id}</div>
          <div>Node: {created.remnawave_node_id}</div>
          <div>Squad: {created.remnawave_squad_id}</div>
          <div>Expires: {new Date(created.expires_at).toLocaleString('ru-RU')}</div>
          <div>Status: {created.status}</div>
          <div>MAX USERS: {created.max_users}</div>
        </div>
      )}
    </div>
  );
}

