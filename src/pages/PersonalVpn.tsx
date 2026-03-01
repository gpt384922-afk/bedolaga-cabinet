import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { personalVpnApi } from '../api/personalVpn';

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ru-RU');
};

const statusLabel = (status?: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'Активен';
    case 'expired':
      return 'Истек';
    case 'disabled':
      return 'Отключен';
    case 'broken':
      return 'Проблема';
    case 'limited':
      return 'Ограничен';
    default:
      return status || 'Неизвестно';
  }
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail?.message) return detail.message;
  }
  if (error instanceof Error) return error.message;
  return 'Ошибка запроса';
};

export default function PersonalVpn() {
  const queryClient = useQueryClient();

  const [expiresAt, setExpiresAt] = useState('');
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [trafficLimitGb, setTrafficLimitGb] = useState(10);
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['personal-vpn-overview'],
    queryFn: personalVpnApi.getOverview,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    setCooldown(Math.max(0, Number(data?.restart_cooldown_remaining_seconds || 0)));
  }, [data?.restart_cooldown_remaining_seconds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const restartMutation = useMutation({
    mutationFn: personalVpnApi.restartNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-vpn-overview'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: personalVpnApi.createSubUser,
    onSuccess: () => {
      setExpiresAt('');
      setDeviceLimit(1);
      setTrafficLimitGb(10);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['personal-vpn-overview'] });
    },
    onError: (error) => {
      setFormError(extractErrorMessage(error));
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: personalVpnApi.deleteSubUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-vpn-overview'] });
    },
  });

  const hasInstance = Boolean(data?.has_instance);
  const isExpired = !hasInstance || (data?.status || '').toLowerCase() !== 'active';
  const maxUsers = Number(data?.max_users || 0);
  const currentUsers = Number(data?.current_user_count || 0);

  const expiresDateOnly = useMemo(() => {
    if (!data?.expires_at) return '';
    return data.expires_at.slice(0, 10);
  }, [data?.expires_at]);

  const canCreate =
    hasInstance &&
    !isExpired &&
    currentUsers < maxUsers &&
    Boolean(expiresAt) &&
    !createUserMutation.isPending;

  const handleCreateUser = () => {
    if (!expiresAt || !data?.expires_at) return;

    if (expiresDateOnly && expiresAt > expiresDateOnly) {
      setFormError('Дата пользователя не может быть позже даты окончания Личного VPN');
      return;
    }

    setFormError(null);
    createUserMutation.mutate({
      expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
      device_limit: Math.max(1, deviceLimit),
      traffic_limit_gb: Math.max(0, trafficLimitGb),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!hasInstance) {
    return (
      <div className="space-y-6">
        <div className="card space-y-4 p-6">
          <h1 className="text-2xl font-bold text-dark-100">Личный VPN</h1>
          <p className="text-sm text-dark-300">
            Личный VPN — отдельная услуга с выделенной нодой и вашим внутренним squad. Управление
            происходит только через кабинет.
          </p>
          <a href="/support" className="btn-primary inline-flex w-fit items-center gap-2">
            Оформить через тикет
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">Личный VPN</h1>
            <p className="text-sm text-dark-400">
              Статус: <span className="font-medium text-dark-200">{statusLabel(data?.status)}</span>
            </p>
            <p className="text-sm text-dark-400">Действует до: {formatDate(data?.expires_at)}</p>
          </div>
          <button
            className="btn-primary"
            disabled={
              isExpired || cooldown > 0 || restartMutation.isPending || (data?.node?.is_disabled ?? false)
            }
            onClick={() => restartMutation.mutate()}
          >
            {restartMutation.isPending ? 'Перезапуск...' : 'Перезапустить ноду'}
          </button>
        </div>

        <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3 text-sm text-dark-300">
          Нода: {data?.node?.name || data?.node?.id || '—'} •{' '}
          {data?.node?.online ? 'онлайн' : 'оффлайн'}
        </div>

        {cooldown > 0 && (
          <p className="text-sm text-warning-400">
            Перезапуск доступен через {Math.ceil(cooldown / 60)} мин.
          </p>
        )}

        {isExpired && (
          <p className="text-sm text-error-400">
            Инстанс не активен: действия (перезапуск, создание и удаление пользователей) недоступны.
          </p>
        )}
      </div>

      <div className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-dark-100">Пользователи</h2>
          <span className="text-sm text-dark-400">
            Использовано: {currentUsers}/{maxUsers}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-dark-500">Дата окончания</label>
            <input
              type="date"
              className="input"
              value={expiresAt}
              max={expiresDateOnly || undefined}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={isExpired}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">Лимит устройств</label>
            <input
              type="number"
              className="input"
              value={deviceLimit}
              min={1}
              onChange={(e) => setDeviceLimit(Math.max(1, Number(e.target.value) || 1))}
              disabled={isExpired}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">Лимит трафика (GB)</label>
            <input
              type="number"
              className="input"
              value={trafficLimitGb}
              min={0}
              step={1}
              onChange={(e) => setTrafficLimitGb(Math.max(0, Number(e.target.value) || 0))}
              disabled={isExpired}
            />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={!canCreate} onClick={handleCreateUser}>
              {createUserMutation.isPending ? 'Создание...' : 'Создать пользователя'}
            </button>
          </div>
        </div>

        {formError && <p className="text-sm text-error-400">{formError}</p>}

        {(data?.sub_users || []).length === 0 && (
          <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3 text-sm text-dark-400">
            Пользователи пока не созданы.
          </div>
        )}

        <div className="space-y-3">
          {(data?.sub_users || []).map((subUser) => (
            <div
              key={subUser.id}
              className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-dark-100">ID: {subUser.remnawave_user_id}</div>
                  <div className="text-dark-400">Статус: {statusLabel(subUser.status)}</div>
                  <div className="text-dark-400">До: {formatDate(subUser.expires_at)}</div>
                </div>
                <button
                  className="btn-secondary"
                  disabled={isExpired || deleteUserMutation.isPending}
                  onClick={() => deleteUserMutation.mutate(subUser.id)}
                >
                  Удалить
                </button>
              </div>

              <div className="mt-2 grid gap-2 text-dark-300 md:grid-cols-3">
                <div>Устройства: {subUser.devices_used}/{subUser.device_limit}</div>
                <div>
                  Трафик: {subUser.traffic_used_gb} / {subUser.traffic_limit_gb} GB
                </div>
                <div>
                  Ссылка:{' '}
                  {subUser.subscription_link ? (
                    <button
                      type="button"
                      className="text-accent-400 underline"
                      onClick={() => navigator.clipboard.writeText(subUser.subscription_link || '')}
                    >
                      Скопировать
                    </button>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {deleteUserMutation.isError && (
          <p className="text-sm text-error-400">{extractErrorMessage(deleteUserMutation.error)}</p>
        )}
        {restartMutation.isError && (
          <p className="text-sm text-error-400">{extractErrorMessage(restartMutation.error)}</p>
        )}
      </div>
    </div>
  );
}

