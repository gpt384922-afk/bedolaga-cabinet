import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { campaignsApi, type CampaignBonusType } from '../api/campaigns';
import { AdminBackButton } from '../components/admin';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

export default function AdminPartnerCampaignCreate() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: partner } = useQuery({
    queryKey: ['admin-partner-detail', userId],
    queryFn: () => partnerApi.getPartnerDetail(Number(userId)),
    enabled: !!userId,
  });

  const partnerName = partner?.first_name || partner?.username || '';
  const suggestedParam = partnerName ? `partner_${slugify(partnerName)}` : '';

  const [name, setName] = useState('');
  const [startParam, setStartParam] = useState('');
  const [bonusType, setBonusType] = useState<CampaignBonusType>('none');

  // Auto-fill start_parameter when partner loads and fields are empty
  const [autoFilled, setAutoFilled] = useState(false);
  useEffect(() => {
    if (partner && !autoFilled) {
      if (!startParam) setStartParam(suggestedParam);
      if (!name && partnerName) setName(partnerName);
      setAutoFilled(true);
    }
  }, [partner, autoFilled, startParam, suggestedParam, name, partnerName]);

  const createAndAssignMutation = useMutation({
    mutationFn: async () => {
      const campaign = await campaignsApi.createCampaign({
        name,
        start_parameter: startParam,
        bonus_type: bonusType,
        is_active: true,
      });
      await partnerApi.assignCampaign(Number(userId), campaign.id);
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-all'] });
      navigate(`/admin/partners/${userId}`);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startParam.trim()) return;
    createAndAssignMutation.mutate();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to={`/admin/partners/${userId}`} />
        <div>
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.partnerDetail.campaigns.createTitle')}
          </h1>
          <p className="text-sm text-dark-400">
            {t('admin.partnerDetail.campaigns.createSubtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-dark-700 bg-dark-800 p-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-dark-300">
              {t('admin.campaigns.form.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
              placeholder={t('admin.campaigns.form.namePlaceholder')}
              required
            />
          </div>

          {/* Start Parameter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-dark-300">
              {t('admin.campaigns.form.startParameter')}
            </label>
            <input
              type="text"
              value={startParam}
              onChange={(e) => setStartParam(e.target.value)}
              className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 font-mono text-dark-100 outline-none focus:border-accent-500"
              placeholder="partner_name"
              required
            />
            <p className="mt-1 text-xs text-dark-500">?start={startParam || '...'}</p>
          </div>

          {/* Bonus Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-dark-300">
              {t('admin.campaigns.form.bonusType')}
            </label>
            <select
              value={bonusType}
              onChange={(e) => setBonusType(e.target.value as CampaignBonusType)}
              className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            >
              <option value="none">{t('admin.campaigns.bonusType.none')}</option>
              <option value="balance">{t('admin.campaigns.bonusType.balance')}</option>
            </select>
          </div>
        </div>

        {/* Auto-assign notice */}
        <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-accent-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            <p className="text-sm text-accent-300">
              {t('admin.partnerDetail.campaigns.autoAssignNote', {
                name: partnerName || `#${userId}`,
              })}
            </p>
          </div>
        </div>

        {createAndAssignMutation.isError && (
          <div className="rounded-lg bg-error-500/10 p-3 text-sm text-error-400">
            {t('common.error')}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/admin/partners/${userId}`)}
            className="flex-1 rounded-lg bg-dark-700 px-4 py-3 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={createAndAssignMutation.isPending || !name.trim() || !startParam.trim()}
            className="flex-1 rounded-lg bg-accent-500 px-4 py-3 font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {createAndAssignMutation.isPending
              ? t('common.saving')
              : t('admin.partnerDetail.campaigns.createAndAssign')}
          </button>
        </div>
      </form>
    </div>
  );
}
