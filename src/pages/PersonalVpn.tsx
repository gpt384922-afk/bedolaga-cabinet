import { useTranslation } from 'react-i18next';
import { LockIcon } from '@/components/icons';

export default function PersonalVpn() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('personalVpn.title')}</h1>
      </div>

      <div className="bento-card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-linear bg-accent-500/10">
            <LockIcon className="h-6 w-6 text-accent-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-dark-100">{t('personalVpn.title')}</h2>
            <p className="mt-1 text-sm text-dark-400">{t('personalVpn.description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
