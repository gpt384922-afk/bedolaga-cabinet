import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { promoApi } from '../api/promo';

export default function PromoDiscountBadge() {
  const { t } = useTranslation();

  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Don't render if no active discount
  if (!activeDiscount || !activeDiscount.is_active || !activeDiscount.discount_percent) {
    return null;
  }

  return (
    <Link
      to="/subscription"
      className="group relative flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-success-500/20 to-accent-500/15 px-2.5 py-1.5 transition-all hover:from-success-500/30 hover:to-accent-500/25"
      title={t('promo.activeDiscount', 'Active discount')}
    >
      <span className="text-base">🏷️</span>
      <span className="text-sm font-bold text-success-400">
        -{activeDiscount.discount_percent}%
      </span>
    </Link>
  );
}
