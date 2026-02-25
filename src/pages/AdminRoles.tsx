import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  rbacApi,
  AdminRole,
  PermissionSection,
  CreateRolePayload,
  UpdateRolePayload,
} from '@/api/rbac';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissionStore } from '@/store/permissions';
import { usePlatform } from '@/platform/hooks/usePlatform';

// === Icons ===

const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
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

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

// === Constants ===

const ROLE_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6b7280', // gray
];

const PRESETS: Record<string, string[]> = {
  moderator: ['users:read', 'users:edit', 'users:block', 'tickets:*', 'ban_system:*'],
  marketer: [
    'campaigns:*',
    'broadcasts:*',
    'promocodes:*',
    'promo_offers:*',
    'promo_groups:*',
    'stats:read',
    'pinned_messages:*',
    'wheel:*',
  ],
  support: ['tickets:read', 'tickets:reply', 'users:read'],
};

// === Types ===

interface RoleFormData {
  name: string;
  description: string;
  level: number;
  color: string;
  permissions: string[];
}

const INITIAL_FORM: RoleFormData = {
  name: '',
  description: '',
  level: 50,
  color: ROLE_COLORS[0],
  permissions: [],
};

// === Sub-components ===

interface PermissionMatrixProps {
  registry: PermissionSection[];
  selectedPermissions: string[];
  onToggle: (perm: string) => void;
  onToggleSection: (section: string, actions: string[]) => void;
}

function PermissionMatrix({
  registry,
  selectedPermissions,
  onToggle,
  onToggleSection,
}: PermissionMatrixProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const isSectionFullySelected = useCallback(
    (section: string, actions: string[]) => {
      return actions.every((action) => {
        const perm = `${section}:${action}`;
        return selectedPermissions.includes(perm) || selectedPermissions.includes(`${section}:*`);
      });
    },
    [selectedPermissions],
  );

  const isSectionPartiallySelected = useCallback(
    (section: string, actions: string[]) => {
      const hasAny = actions.some((action) => {
        const perm = `${section}:${action}`;
        return selectedPermissions.includes(perm) || selectedPermissions.includes(`${section}:*`);
      });
      return hasAny && !isSectionFullySelected(section, actions);
    },
    [selectedPermissions, isSectionFullySelected],
  );

  const isPermSelected = useCallback(
    (section: string, action: string) => {
      const perm = `${section}:${action}`;
      return selectedPermissions.includes(perm) || selectedPermissions.includes(`${section}:*`);
    },
    [selectedPermissions],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-dark-200">
        {t('admin.roles.form.permissions')}
      </label>
      <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-dark-600 bg-dark-900/50 p-2">
        {registry.map((section) => {
          const isExpanded = expanded[section.section] ?? false;
          const allSelected = isSectionFullySelected(section.section, section.actions);
          const partialSelected = isSectionPartiallySelected(section.section, section.actions);

          return (
            <div
              key={section.section}
              className="rounded-lg border border-dark-700/50 bg-dark-800/30"
            >
              {/* Section header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onToggleSection(section.section, section.actions)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    allSelected
                      ? 'border-accent-500 bg-accent-500'
                      : partialSelected
                        ? 'border-accent-500 bg-accent-500/40'
                        : 'border-dark-500 hover:border-dark-400'
                  }`}
                  aria-label={t('admin.roles.form.toggleSection', {
                    section: section.section,
                  })}
                >
                  {(allSelected || partialSelected) && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      {allSelected ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      )}
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(section.section)}
                  className="flex flex-1 items-center justify-between"
                >
                  <span className="text-sm font-medium text-dark-200">{section.section}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-500">
                      {section.actions.filter((a) => isPermSelected(section.section, a)).length}/
                      {section.actions.length}
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-dark-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Actions list */}
              {isExpanded && (
                <div className="border-t border-dark-700/50 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {section.actions.map((action) => {
                      const perm = `${section.section}:${action}`;
                      const selected = isPermSelected(section.section, action);

                      return (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => onToggle(perm)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? 'bg-accent-500/20 text-accent-400'
                              : 'bg-dark-700/50 text-dark-400 hover:bg-dark-700 hover:text-dark-300'
                          }`}
                          aria-pressed={selected}
                        >
                          {action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Main Page ===

export default function AdminRoles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const canManageRole = usePermissionStore((s) => s.canManageRole);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(INITIAL_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: rbacApi.getRoles,
  });

  const { data: permissionRegistry } = useQuery({
    queryKey: ['admin-permission-registry'],
    queryFn: rbacApi.getPermissionRegistry,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateRolePayload) => rbacApi.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      closeModal();
    },
    onError: () => {
      setFormError(t('admin.roles.errors.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRolePayload }) =>
      rbacApi.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      closeModal();
    },
    onError: () => {
      setFormError(t('admin.roles.errors.updateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setDeleteConfirm(null);
    },
    onError: () => {
      setDeleteConfirm(null);
      setFormError(t('admin.roles.errors.deleteFailed'));
    },
  });

  // Handlers
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingRole(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingRole(null);
    setFormData(INITIAL_FORM);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((role: AdminRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      level: role.level,
      color: role.color || ROLE_COLORS[0],
      permissions: [...role.permissions],
    });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const handleTogglePermission = useCallback((perm: string) => {
    setFormData((prev) => {
      const has = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: has ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm],
      };
    });
  }, []);

  const handleToggleSection = useCallback((section: string, actions: string[]) => {
    setFormData((prev) => {
      const allPerms = actions.map((a) => `${section}:${a}`);
      const allSelected = allPerms.every(
        (p) => prev.permissions.includes(p) || prev.permissions.includes(`${section}:*`),
      );

      if (allSelected) {
        // Deselect all in this section (both individual and wildcard)
        const sectionPerms = new Set([...allPerms, `${section}:*`]);
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => !sectionPerms.has(p)),
        };
      }

      // Select all: use wildcard
      const withoutSection = prev.permissions.filter((p) => !p.startsWith(`${section}:`));
      return {
        ...prev,
        permissions: [...withoutSection, `${section}:*`],
      };
    });
  }, []);

  const handleApplyPreset = useCallback((presetKey: string) => {
    const presetPerms = PRESETS[presetKey];
    if (!presetPerms) return;
    setFormData((prev) => ({
      ...prev,
      permissions: [...presetPerms],
    }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!formData.name.trim()) {
        setFormError(t('admin.roles.errors.nameRequired'));
        return;
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level: formData.level,
        permissions: formData.permissions,
        color: formData.color,
      };

      if (editingRole) {
        updateMutation.mutate({ id: editingRole.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [formData, editingRole, createMutation, updateMutation, t],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Sorted roles by level descending
  const sortedRoles = useMemo(() => {
    if (!roles) return [];
    return [...roles].sort((a, b) => b.level - a.level);
  }, [roles]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.roles.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.roles.subtitle')}</p>
          </div>
        </div>
        <PermissionGate permission="roles:create">
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            {t('admin.roles.createRole')}
          </button>
        </PermissionGate>
      </div>

      {/* Stats Overview */}
      {sortedRoles.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-dark-100">{sortedRoles.length}</div>
            <div className="text-xs text-dark-400">{t('admin.roles.stats.totalRoles')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-accent-400">
              {sortedRoles.filter((r) => r.is_active).length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.roles.stats.active')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="text-2xl font-bold text-warning-400">
              {sortedRoles.filter((r) => r.is_system).length}
            </div>
            <div className="text-xs text-dark-400">{t('admin.roles.stats.system')}</div>
          </div>
        </div>
      )}

      {/* Roles List */}
      {rolesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : rolesError ? (
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.roles.errors.loadFailed')}</p>
        </div>
      ) : sortedRoles.length === 0 ? (
        <div className="py-12 text-center">
          <ShieldIcon />
          <p className="mt-2 text-dark-400">{t('admin.roles.noRoles')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRoles.map((role) => (
            <div
              key={role.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                role.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  {/* Role name with color badge */}
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: role.color || '#6b7280' }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-dark-100">{role.name}</span>
                    {role.is_system && (
                      <span className="rounded bg-warning-500/20 px-1.5 py-0.5 text-xs text-warning-400">
                        {t('admin.roles.systemBadge')}
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="rounded bg-dark-600 px-1.5 py-0.5 text-xs text-dark-400">
                        {t('admin.roles.inactiveBadge')}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span>
                      {t('admin.roles.levelLabel')}: {role.level}
                    </span>
                    {role.description && <span>{role.description}</span>}
                    <span>{t('admin.roles.usersCount', { count: role.user_count ?? 0 })}</span>
                    <span>
                      {t('admin.roles.permissionsCount', {
                        count: role.permissions.length,
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-dark-700 pt-3 sm:border-0 sm:pt-0">
                  <PermissionGate permission="roles:edit">
                    <button
                      onClick={() => openEditModal(role)}
                      disabled={role.is_system || !canManageRole(role.level)}
                      className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      title={t('admin.roles.actions.edit')}
                    >
                      <EditIcon />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="roles:delete">
                    <button
                      onClick={() => setDeleteConfirm(role.id)}
                      disabled={role.is_system || !canManageRole(role.level)}
                      className="flex-1 rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      title={t('admin.roles.actions.delete')}
                    >
                      <TrashIcon />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[5vh]">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60" onClick={closeModal} aria-hidden="true" />
          {/* Modal content */}
          <div className="relative w-full max-w-lg rounded-xl border border-dark-700 bg-dark-800 p-6 shadow-xl">
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark-100">
                {editingRole
                  ? t('admin.roles.modal.editTitle')
                  : t('admin.roles.modal.createTitle')}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
                aria-label={t('admin.roles.modal.close')}
              >
                <XMarkIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="role-name" className="mb-1 block text-sm font-medium text-dark-200">
                  {t('admin.roles.form.name')}
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                  placeholder={t('admin.roles.form.namePlaceholder')}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="role-description"
                  className="mb-1 block text-sm font-medium text-dark-200"
                >
                  {t('admin.roles.form.description')}
                </label>
                <textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                  placeholder={t('admin.roles.form.descriptionPlaceholder')}
                  rows={2}
                />
              </div>

              {/* Level */}
              <div>
                <label
                  htmlFor="role-level"
                  className="mb-1 block text-sm font-medium text-dark-200"
                >
                  {t('admin.roles.form.level')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="role-level"
                    type="range"
                    min={0}
                    max={999}
                    value={formData.level}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        level: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-accent-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={formData.level}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        level: Math.min(999, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-20 rounded-lg border border-dark-600 bg-dark-900 px-2 py-1.5 text-center text-sm text-dark-100 outline-none focus:border-accent-500"
                    aria-label={t('admin.roles.form.levelValue')}
                  />
                </div>
                <p className="mt-1 text-xs text-dark-500">{t('admin.roles.form.levelHint')}</p>
              </div>

              {/* Color picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-200">
                  {t('admin.roles.form.color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === color ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              {/* Preset buttons */}
              <div>
                <label className="mb-1 block text-sm font-medium text-dark-200">
                  {t('admin.roles.form.presets')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PRESETS).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyPreset(key)}
                      className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-1.5 text-xs font-medium text-dark-300 transition-colors hover:border-accent-500/50 hover:bg-accent-500/10 hover:text-accent-400"
                    >
                      {t(`admin.roles.presets.${key}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Matrix */}
              {permissionRegistry && permissionRegistry.length > 0 && (
                <PermissionMatrix
                  registry={permissionRegistry}
                  selectedPermissions={formData.permissions}
                  onToggle={handleTogglePermission}
                  onToggleSection={handleToggleSection}
                />
              )}

              {/* Selected count */}
              <p className="text-xs text-dark-500">
                {t('admin.roles.form.selectedPermissions', {
                  count: formData.permissions.length,
                })}
              </p>

              {/* Error */}
              {formError && <p className="text-sm text-error-400">{formError}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
                >
                  {t('admin.roles.form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                >
                  {isSaving ? t('admin.roles.form.saving') : t('admin.roles.form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-xl border border-dark-700 bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.roles.confirm.title')}
            </h3>
            <p className="mb-6 text-dark-400">{t('admin.roles.confirm.text')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('admin.roles.confirm.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600 disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? t('admin.roles.confirm.deleting')
                  : t('admin.roles.confirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
