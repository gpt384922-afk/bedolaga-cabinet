import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  tariffsApi,
  TariffDetail,
  TariffCreateRequest,
  TariffUpdateRequest,
  PeriodPrice,
  ServerInfo,
} from '../api/tariffs';
import { AdminBackButton } from '../components/admin';

// Icons
const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const InfinityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const SunIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

type TariffType = 'period' | 'daily' | null;

export default function AdminTariffCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Step: null = type selection, 'period' or 'daily' = form
  const [tariffType, setTariffType] = useState<TariffType>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trafficLimitGb, setTrafficLimitGb] = useState(100);
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [devicePriceKopeks, setDevicePriceKopeks] = useState(0);
  const [maxDeviceLimit, setMaxDeviceLimit] = useState(0);
  const [tierLevel, setTierLevel] = useState(1);
  const [periodPrices, setPeriodPrices] = useState<PeriodPrice[]>([]);
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [dailyPriceKopeks, setDailyPriceKopeks] = useState(0);

  // Traffic topup
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(false);
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState(0);
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>({});

  // Traffic reset mode
  const [trafficResetMode, setTrafficResetMode] = useState<string | null>(null);

  // Custom days (period tariff)
  const [customDaysEnabled, setCustomDaysEnabled] = useState(false);
  const [pricePerDayKopeks, setPricePerDayKopeks] = useState(0);
  const [minDays, setMinDays] = useState(1);
  const [maxDays, setMaxDays] = useState(365);

  // Custom traffic (period tariff)
  const [customTrafficEnabled, setCustomTrafficEnabled] = useState(false);
  const [trafficPricePerGbKopeks, setTrafficPricePerGbKopeks] = useState(0);
  const [minTrafficGb, setMinTrafficGb] = useState(1);
  const [maxTrafficGb, setMaxTrafficGb] = useState(1000);

  // New period for adding
  const [newPeriodDays, setNewPeriodDays] = useState(30);
  const [newPeriodPrice, setNewPeriodPrice] = useState(300);

  const [activeTab, setActiveTab] = useState<'basic' | 'periods' | 'servers' | 'extra'>('basic');

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ['admin-tariffs-servers'],
    queryFn: () => tariffsApi.getAvailableServers(),
  });

  // Fetch tariff for editing
  const { isLoading: isLoadingTariff } = useQuery({
    queryKey: ['admin-tariff', id],
    queryFn: () => tariffsApi.getTariff(Number(id)),
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    select: useCallback((data: TariffDetail) => {
      setTariffType(data.is_daily ? 'daily' : 'period');
      setName(data.name);
      setDescription(data.description || '');
      setTrafficLimitGb(data.traffic_limit_gb ?? 100);
      setDeviceLimit(data.device_limit || 1);
      setDevicePriceKopeks(data.device_price_kopeks || 0);
      setMaxDeviceLimit(data.max_device_limit || 0);
      setTierLevel(data.tier_level || 1);
      setPeriodPrices(data.period_prices?.length ? data.period_prices : []);
      setSelectedSquads(data.allowed_squads || []);
      setDailyPriceKopeks(data.daily_price_kopeks || 0);
      setTrafficTopupEnabled(data.traffic_topup_enabled || false);
      setMaxTopupTrafficGb(data.max_topup_traffic_gb || 0);
      setTrafficTopupPackages(data.traffic_topup_packages || {});
      setTrafficResetMode(data.traffic_reset_mode || null);
      setCustomDaysEnabled(data.custom_days_enabled || false);
      setPricePerDayKopeks(data.price_per_day_kopeks || 0);
      setMinDays(data.min_days || 1);
      setMaxDays(data.max_days || 365);
      setCustomTrafficEnabled(data.custom_traffic_enabled || false);
      setTrafficPricePerGbKopeks(data.traffic_price_per_gb_kopeks || 0);
      setMinTrafficGb(data.min_traffic_gb || 1);
      setMaxTrafficGb(data.max_traffic_gb || 1000);
      return data;
    }, []),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: tariffsApi.createTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      navigate('/admin/tariffs');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TariffUpdateRequest }) =>
      tariffsApi.updateTariff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      navigate('/admin/tariffs');
    },
  });

  const handleSubmit = () => {
    const isDaily = tariffType === 'daily';

    const data: TariffCreateRequest | TariffUpdateRequest = {
      name,
      description: description || undefined,
      traffic_limit_gb: trafficLimitGb,
      device_limit: deviceLimit,
      device_price_kopeks: devicePriceKopeks > 0 ? devicePriceKopeks : undefined,
      max_device_limit: maxDeviceLimit > 0 ? maxDeviceLimit : undefined,
      tier_level: tierLevel,
      period_prices: isDaily ? [] : periodPrices.filter((p) => p.price_kopeks >= 0),
      allowed_squads: selectedSquads,
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: maxTopupTrafficGb,
      is_daily: isDaily,
      daily_price_kopeks: isDaily ? dailyPriceKopeks : 0,
      traffic_reset_mode: trafficResetMode,
    };

    if (!isDaily) {
      data.custom_days_enabled = customDaysEnabled;
      data.price_per_day_kopeks = pricePerDayKopeks;
      data.min_days = minDays;
      data.max_days = maxDays;
      data.custom_traffic_enabled = customTrafficEnabled;
      data.traffic_price_per_gb_kopeks = trafficPricePerGbKopeks;
      data.min_traffic_gb = minTrafficGb;
      data.max_traffic_gb = maxTrafficGb;
    }

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data });
    } else {
      createMutation.mutate(data as TariffCreateRequest);
    }
  };

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const addPeriod = () => {
    if (newPeriodDays > 0 && newPeriodPrice > 0) {
      const exists = periodPrices.some((p) => p.days === newPeriodDays);
      if (!exists) {
        setPeriodPrices((prev) =>
          [...prev, { days: newPeriodDays, price_kopeks: newPeriodPrice * 100 }].sort(
            (a, b) => a.days - b.days,
          ),
        );
        setNewPeriodDays(30);
        setNewPeriodPrice(300);
      }
    }
  };

  const removePeriod = (days: number) => {
    setPeriodPrices((prev) => prev.filter((p) => p.days !== days));
  };

  const updatePeriodPrice = (days: number, priceRubles: number) => {
    setPeriodPrices((prev) =>
      prev.map((p) => (p.days === days ? { ...p, price_kopeks: priceRubles * 100 } : p)),
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const isValidPeriod = name && (periodPrices.length > 0 || customDaysEnabled);
  const isValidDaily = name && dailyPriceKopeks > 0;
  const isValid =
    tariffType === 'period' ? isValidPeriod : tariffType === 'daily' ? isValidDaily : false;

  // Loading state
  if (isEdit && isLoadingTariff) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Type selection step (only for creation)
  if (!isEdit && tariffType === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <div>
            <h1 className="text-xl font-bold text-dark-100">{t('admin.tariffs.selectType')}</h1>
            <p className="text-sm text-dark-400">{t('admin.tariffs.selectTypeDesc')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setTariffType('period')}
            className="card group p-6 text-left transition-colors hover:border-accent-500/50"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent-500/20 p-3 text-accent-400 group-hover:bg-accent-500/30">
                <CalendarIcon />
              </div>
              <div>
                <h3 className="font-medium text-dark-100">{t('admin.tariffs.periodTariff')}</h3>
                <p className="mt-1 text-sm text-dark-400">{t('admin.tariffs.periodTariffDesc')}</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setTariffType('daily')}
            className="card group p-6 text-left transition-colors hover:border-warning-500/50"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-warning-500/20 p-3 text-warning-400 group-hover:bg-warning-500/30">
                <SunIcon />
              </div>
              <div>
                <h3 className="font-medium text-dark-100">{t('admin.tariffs.dailyTariff')}</h3>
                <p className="mt-1 text-sm text-dark-400">{t('admin.tariffs.dailyTariffDesc')}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const isDaily = tariffType === 'daily';
  const accentColor = isDaily ? 'warning' : 'accent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div className="flex items-center gap-3">
          <div className={`rounded-lg bg-${accentColor}-500/20 p-2 text-${accentColor}-400`}>
            {isDaily ? <SunIcon /> : <CalendarIcon />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">
              {isEdit
                ? t('admin.tariffs.editTitle')
                : isDaily
                  ? t('admin.tariffs.newDailyTitle')
                  : t('admin.tariffs.newPeriodTitle')}
            </h1>
            <p className="text-sm text-dark-400">
              {isDaily ? t('admin.tariffs.dailyDeduction') : t('admin.tariffs.periodPayment')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {(isDaily
          ? (['basic', 'servers', 'extra'] as const)
          : (['basic', 'periods', 'servers', 'extra'] as const)
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab
                ? `bg-${accentColor}-500/15 text-${accentColor}-400 ring-1 ring-${accentColor}-500/30`
                : 'bg-dark-800/50 text-dark-400 hover:bg-dark-700'
            }`}
          >
            {tab === 'basic' && t('admin.tariffs.tabBasic')}
            {tab === 'periods' && t('admin.tariffs.tabPeriods')}
            {tab === 'servers' && t('admin.tariffs.tabServers')}
            {tab === 'extra' && t('admin.tariffs.tabExtra')}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'basic' && (
        <div className="card space-y-4">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.tariffs.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder={
                isDaily ? t('admin.tariffs.nameExampleDaily') : t('admin.tariffs.nameExamplePeriod')
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.tariffs.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[80px] resize-none"
              placeholder={t('admin.tariffs.descriptionPlaceholder')}
            />
          </div>

          {/* Daily Price (only for daily tariff) */}
          {isDaily && (
            <div className="rounded-lg border border-warning-500/30 bg-warning-500/10 p-4">
              <label className="mb-2 block text-sm font-medium text-warning-400">
                {t('admin.tariffs.dailyPriceLabel')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dailyPriceKopeks / 100}
                  onChange={(e) =>
                    setDailyPriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                  }
                  className="input w-32"
                  min={0}
                  step={0.1}
                />
                <span className="text-dark-400">{t('admin.tariffs.currencyPerDay')}</span>
              </div>
              <p className="mt-2 text-xs text-dark-500">{t('admin.tariffs.dailyDeductionDesc')}</p>
            </div>
          )}

          {/* Traffic Limit */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.tariffs.trafficLimitLabel')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={trafficLimitGb}
                onChange={(e) => setTrafficLimitGb(Math.max(0, parseInt(e.target.value) || 0))}
                className="input w-32"
                min={0}
              />
              <span className="text-dark-400">{t('admin.tariffs.gbUnit')}</span>
              {trafficLimitGb === 0 && (
                <span className="flex items-center gap-1 text-sm text-success-500">
                  <InfinityIcon />
                  {t('admin.tariffs.unlimited')}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-dark-500">{t('admin.tariffs.trafficLimitHint')}</p>
          </div>

          {/* Device Limit */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.tariffs.deviceLimitLabel')}
            </label>
            <input
              type="number"
              value={deviceLimit}
              onChange={(e) => setDeviceLimit(Math.max(1, parseInt(e.target.value) || 1))}
              className="input w-32"
              min={1}
            />
          </div>

          {/* Tier Level */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.tariffs.tierLevelLabel')}
            </label>
            <input
              type="number"
              value={tierLevel}
              onChange={(e) =>
                setTierLevel(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="input w-32"
              min={1}
              max={10}
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.tariffs.tierLevelHint')}</p>
          </div>
        </div>
      )}

      {activeTab === 'periods' && !isDaily && (
        <div className="card space-y-4">
          <p className="text-sm text-dark-400">{t('admin.tariffs.periodsTabHint')}</p>

          {/* Add new period */}
          <div className="rounded-lg border border-dashed border-dark-600 bg-dark-800/50 p-4">
            <h4 className="mb-3 text-sm font-medium text-dark-300">
              {t('admin.tariffs.addPeriodTitle')}
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-dark-500">
                  {t('admin.tariffs.daysLabel')}
                </label>
                <input
                  type="number"
                  value={newPeriodDays}
                  onChange={(e) => setNewPeriodDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-24"
                  min={1}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-dark-500">
                  {t('admin.tariffs.priceLabel')}
                </label>
                <input
                  type="number"
                  value={newPeriodPrice}
                  onChange={(e) => setNewPeriodPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-28"
                  min={1}
                />
              </div>
              <button
                onClick={addPeriod}
                disabled={periodPrices.some((p) => p.days === newPeriodDays)}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon />
                {t('admin.tariffs.addButton')}
              </button>
            </div>
          </div>

          {/* Period list */}
          {periodPrices.length === 0 ? (
            <div className="py-8 text-center text-dark-500">{t('admin.tariffs.noPeriodsHint')}</div>
          ) : (
            <div className="space-y-2">
              {periodPrices.map((period) => (
                <div
                  key={period.days}
                  className="flex items-center gap-3 rounded-lg bg-dark-800 p-3"
                >
                  <div className="w-20 font-medium text-dark-300">
                    {period.days} {t('admin.tariffs.daysShort')}
                  </div>
                  <input
                    type="number"
                    value={period.price_kopeks / 100}
                    onChange={(e) =>
                      updatePeriodPrice(period.days, Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="input w-28"
                    min={0}
                    step={1}
                  />
                  <span className="text-dark-400">₽</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => removePeriod(period.days)}
                    className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-error-500/20 hover:text-error-400"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'servers' && (
        <div className="card space-y-4">
          <p className="text-sm text-dark-400">{t('admin.tariffs.serversTabHint')}</p>
          {servers.length === 0 ? (
            <p className="py-4 text-center text-dark-500">
              {t('admin.tariffs.noServersAvailable')}
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {servers.map((server: ServerInfo) => {
                const isSelected = selectedSquads.includes(server.squad_uuid);
                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => toggleServer(server.squad_uuid)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      isSelected
                        ? `bg-${accentColor}-500/20 text-${accentColor}-300`
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded ${
                        isSelected ? 'bg-accent-500 text-white' : 'bg-dark-600'
                      }`}
                    >
                      {isSelected && <CheckIcon />}
                    </div>
                    <span className="flex-1 text-sm font-medium">{server.display_name}</span>
                    {server.country_code && (
                      <span className="text-xs text-dark-500">{server.country_code}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'extra' && (
        <div className="space-y-4">
          {/* Device addon */}
          <div className="card space-y-3">
            <h4 className="text-sm font-medium text-dark-200">
              {t('admin.tariffs.extraDeviceTitle')}
            </h4>
            <div className="flex items-center gap-3">
              <span className="w-48 text-sm text-dark-400">
                {t('admin.tariffs.devicePriceLabel')}
              </span>
              <input
                type="number"
                value={devicePriceKopeks / 100}
                onChange={(e) =>
                  setDevicePriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                }
                className="input w-24"
                min={0}
                step={1}
              />
              <span className="text-dark-400">₽</span>
            </div>
            <p className="text-xs text-dark-500">{t('admin.tariffs.devicePriceHint')}</p>
            <div className="flex items-center gap-3">
              <span className="w-48 text-sm text-dark-400">
                {t('admin.tariffs.maxDeviceLabel')}
              </span>
              <input
                type="number"
                value={maxDeviceLimit}
                onChange={(e) => setMaxDeviceLimit(Math.max(0, parseInt(e.target.value) || 0))}
                className="input w-24"
                min={0}
              />
            </div>
            <p className="text-xs text-dark-500">{t('admin.tariffs.noLimitHint')}</p>
          </div>

          {/* Traffic topup */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-dark-200">
                {t('admin.tariffs.extraTrafficTitle')}
              </h4>
              <button
                type="button"
                onClick={() => setTrafficTopupEnabled(!trafficTopupEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  trafficTopupEnabled ? 'bg-accent-500' : 'bg-dark-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    trafficTopupEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
            {trafficTopupEnabled && (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-32 text-sm text-dark-400">
                    {t('admin.tariffs.trafficMaxLimitLabel')}
                  </span>
                  <input
                    type="number"
                    value={maxTopupTrafficGb}
                    onChange={(e) =>
                      setMaxTopupTrafficGb(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="input w-24"
                    min={0}
                  />
                  <span className="text-dark-400">{t('admin.tariffs.gbUnit')}</span>
                </div>
                <div>
                  <span className="text-sm text-dark-400">
                    {t('admin.tariffs.trafficPackagesLabel')}
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[5, 10, 20, 50].map((gb) => (
                      <div key={gb} className="flex items-center gap-2">
                        <span className="w-12 text-sm text-dark-300">
                          {gb} {t('admin.tariffs.gbPackageUnit')}
                        </span>
                        <input
                          type="number"
                          value={(trafficTopupPackages[String(gb)] || 0) / 100}
                          onChange={(e) => {
                            const price = Math.max(0, parseFloat(e.target.value) || 0) * 100;
                            setTrafficTopupPackages((prev) => ({
                              ...prev,
                              [String(gb)]: price,
                            }));
                          }}
                          className="input w-20"
                          min={0}
                          step={1}
                        />
                        <span className="text-xs text-dark-400">₽</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Custom days (period only) */}
          {!isDaily && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-dark-200">
                    {t('admin.tariffs.customDaysTitle')}
                  </h4>
                  <p className="mt-1 text-xs text-dark-500">{t('admin.tariffs.customDaysDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomDaysEnabled(!customDaysEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    customDaysEnabled ? 'bg-accent-500' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      customDaysEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {customDaysEnabled && (
                <div className="space-y-3 border-t border-dark-700 pt-3">
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm text-dark-400">
                      {t('admin.tariffs.pricePerDayLabel')}
                    </span>
                    <input
                      type="number"
                      value={pricePerDayKopeks / 100}
                      onChange={(e) =>
                        setPricePerDayKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                      }
                      className="input w-24"
                      min={0}
                      step={0.1}
                    />
                    <span className="text-dark-400">₽</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm text-dark-400">
                      {t('admin.tariffs.minDaysLabel')}
                    </span>
                    <input
                      type="number"
                      value={minDays}
                      onChange={(e) => setMinDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input w-24"
                      min={1}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm text-dark-400">
                      {t('admin.tariffs.maxDaysLabel')}
                    </span>
                    <input
                      type="number"
                      value={maxDays}
                      onChange={(e) => setMaxDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input w-24"
                      min={1}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom traffic (period only) */}
          {!isDaily && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-dark-200">
                    {t('admin.tariffs.customTrafficTitle')}
                  </h4>
                  <p className="mt-1 text-xs text-dark-500">
                    {t('admin.tariffs.customTrafficDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomTrafficEnabled(!customTrafficEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    customTrafficEnabled ? 'bg-accent-500' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      customTrafficEnabled ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
              {customTrafficEnabled && (
                <div className="space-y-3 border-t border-dark-700 pt-3">
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm text-dark-400">
                      {t('admin.tariffs.pricePerGbLabel')}
                    </span>
                    <input
                      type="number"
                      value={trafficPricePerGbKopeks / 100}
                      onChange={(e) =>
                        setTrafficPricePerGbKopeks(
                          Math.max(0, parseFloat(e.target.value) || 0) * 100,
                        )
                      }
                      className="input w-24"
                      min={0}
                      step={0.1}
                    />
                    <span className="text-dark-400">₽</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm text-dark-400">
                      {t('admin.tariffs.minTrafficLabel')}
                    </span>
                    <input
                      type="number"
                      value={minTrafficGb}
                      onChange={(e) => setMinTrafficGb(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input w-24"
                      min={1}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-sm text-dark-400">
                      {t('admin.tariffs.maxTrafficLabel')}
                    </span>
                    <input
                      type="number"
                      value={maxTrafficGb}
                      onChange={(e) => setMaxTrafficGb(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input w-24"
                      min={1}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Traffic reset mode */}
          <div className="card space-y-3">
            <h4 className="text-sm font-medium text-dark-200">
              {t('admin.tariffs.trafficResetModeTitle')}
            </h4>
            <p className="text-xs text-dark-500">{t('admin.tariffs.trafficResetModeDesc')}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: null, labelKey: 'admin.tariffs.resetModeGlobal', emoji: '🌐' },
                { value: 'DAY', labelKey: 'admin.tariffs.resetModeDaily', emoji: '📅' },
                { value: 'WEEK', labelKey: 'admin.tariffs.resetModeWeekly', emoji: '📆' },
                { value: 'MONTH', labelKey: 'admin.tariffs.resetModeMonthly', emoji: '🗓️' },
                { value: 'NO_RESET', labelKey: 'admin.tariffs.resetModeNever', emoji: '🚫' },
              ].map((option) => (
                <button
                  key={option.value || 'global'}
                  type="button"
                  onClick={() => setTrafficResetMode(option.value)}
                  className={`rounded-lg p-3 text-left text-sm transition-colors ${
                    trafficResetMode === option.value
                      ? `bg-${accentColor}-500/20 text-${accentColor}-300 ring-1 ring-${accentColor}-500/30`
                      : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                  }`}
                >
                  {option.emoji} {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="card flex items-center justify-end gap-3">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {isLoading && <RefreshIcon />}
          {isLoading ? t('admin.tariffs.savingButton') : t('admin.tariffs.saveButton')}
        </button>
      </div>
    </div>
  );
}
