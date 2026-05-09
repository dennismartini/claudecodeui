import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DarkModeToggle } from '../../../../shared/view/ui';
import type { CodeEditorSettingsState, ProjectSortOrder } from '../../types/types';
import type { PermissionMode } from '../../../chat/types/types';
import LanguageSelector from '../../../../shared/view/ui/LanguageSelector';
import { useTheme } from '../../../../contexts/ThemeContext';
import SettingsCard from '../SettingsCard';
import SettingsRow from '../SettingsRow';
import SettingsSection from '../SettingsSection';
import SettingsToggle from '../SettingsToggle';

const DEFAULT_PERMISSION_MODE_KEY = 'defaultPermissionMode';
const DEFAULT_PERMISSION_MODE_OPTIONS: PermissionMode[] = ['default', 'auto', 'acceptEdits', 'bypassPermissions'];

const readDefaultPermissionMode = (): PermissionMode => {
  try {
    const value = localStorage.getItem(DEFAULT_PERMISSION_MODE_KEY) as PermissionMode | null;
    if (value && DEFAULT_PERMISSION_MODE_OPTIONS.includes(value)) {
      return value;
    }
  } catch {
    // ignore
  }
  return 'default';
};

type AppearanceSettingsTabProps = {
  projectSortOrder: ProjectSortOrder;
  onProjectSortOrderChange: (value: ProjectSortOrder) => void;
  codeEditorSettings: CodeEditorSettingsState;
  onCodeEditorThemeChange: (value: 'dark' | 'light') => void;
  onCodeEditorWordWrapChange: (value: boolean) => void;
  onCodeEditorShowMinimapChange: (value: boolean) => void;
  onCodeEditorLineNumbersChange: (value: boolean) => void;
  onCodeEditorFontSizeChange: (value: string) => void;
};

export default function AppearanceSettingsTab({
  projectSortOrder,
  onProjectSortOrderChange,
  codeEditorSettings,
  onCodeEditorThemeChange,
  onCodeEditorWordWrapChange,
  onCodeEditorShowMinimapChange,
  onCodeEditorLineNumbersChange,
  onCodeEditorFontSizeChange,
}: AppearanceSettingsTabProps) {
  const { t } = useTranslation('settings');
  const { theme, setTheme } = useTheme();
  const [defaultPermissionMode, setDefaultPermissionMode] = useState<PermissionMode>(readDefaultPermissionMode);

  useEffect(() => {
    try {
      localStorage.setItem(DEFAULT_PERMISSION_MODE_KEY, defaultPermissionMode);
    } catch {
      // ignore — non-critical
    }
  }, [defaultPermissionMode]);

  return (
    <div className="space-y-8">
      <SettingsSection title={t('appearanceSettings.darkMode.label')}>
        <SettingsCard divided>
          <SettingsRow
            label={t('appearanceSettings.darkMode.label')}
            description={t('appearanceSettings.darkMode.description')}
          >
            <DarkModeToggle ariaLabel={t('appearanceSettings.darkMode.label')} />
          </SettingsRow>
          <SettingsRow
            label={t('appearanceSettings.theme.label', 'Color theme')}
            description={t('appearanceSettings.theme.description', 'Pick a theme variant. Affects the whole UI.')}
          >
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'vscode-dark')}
              className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground touch-manipulation focus:border-primary focus:ring-1 focus:ring-primary sm:w-56"
            >
              <option value="light">{t('appearanceSettings.theme.light', 'Light')}</option>
              <option value="dark">{t('appearanceSettings.theme.dark', 'Dark (classic)')}</option>
              <option value="vscode-dark">{t('appearanceSettings.theme.vscodeDark', 'Dark (VS Code grayscale)')}</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('appearanceSettings.permissionMode.label', 'Default permission mode')}>
        <SettingsCard>
          <SettingsRow
            label={t('appearanceSettings.permissionMode.label', 'Default permission mode')}
            description={t(
              'appearanceSettings.permissionMode.description',
              'Mode applied to new sessions (and any session without its own preference). Use "Bypass Permissions" to skip approval prompts globally — same as Claude Code CLI with --dangerously-skip-permissions.',
            )}
          >
            <select
              value={defaultPermissionMode}
              onChange={(event) => setDefaultPermissionMode(event.target.value as PermissionMode)}
              className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground touch-manipulation focus:border-primary focus:ring-1 focus:ring-primary sm:w-56"
            >
              <option value="default">{t('appearanceSettings.permissionMode.optionDefault', 'Default (ask each time)')}</option>
              <option value="auto">{t('appearanceSettings.permissionMode.optionAuto', 'Auto')}</option>
              <option value="acceptEdits">{t('appearanceSettings.permissionMode.optionAcceptEdits', 'Accept edits')}</option>
              <option value="bypassPermissions">{t('appearanceSettings.permissionMode.optionBypass', 'Bypass permissions')}</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('mainTabs.appearance')}>
        <SettingsCard>
          <LanguageSelector />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('appearanceSettings.projectSorting.label')}>
        <SettingsCard>
          <SettingsRow
            label={t('appearanceSettings.projectSorting.label')}
            description={t('appearanceSettings.projectSorting.description')}
          >
            <select
              value={projectSortOrder}
              onChange={(event) => onProjectSortOrderChange(event.target.value as ProjectSortOrder)}
              className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground touch-manipulation focus:border-primary focus:ring-1 focus:ring-primary sm:w-36"
            >
              <option value="name">{t('appearanceSettings.projectSorting.alphabetical')}</option>
              <option value="date">{t('appearanceSettings.projectSorting.recentActivity')}</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={t('appearanceSettings.codeEditor.title')}>
        <SettingsCard divided>
          <SettingsRow
            label={t('appearanceSettings.codeEditor.theme.label')}
            description={t('appearanceSettings.codeEditor.theme.description')}
          >
            <DarkModeToggle
              checked={codeEditorSettings.theme === 'dark'}
              onToggle={(enabled) => onCodeEditorThemeChange(enabled ? 'dark' : 'light')}
              ariaLabel={t('appearanceSettings.codeEditor.theme.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.wordWrap.label')}
            description={t('appearanceSettings.codeEditor.wordWrap.description')}
          >
            <SettingsToggle
              checked={codeEditorSettings.wordWrap}
              onChange={onCodeEditorWordWrapChange}
              ariaLabel={t('appearanceSettings.codeEditor.wordWrap.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.showMinimap.label')}
            description={t('appearanceSettings.codeEditor.showMinimap.description')}
          >
            <SettingsToggle
              checked={codeEditorSettings.showMinimap}
              onChange={onCodeEditorShowMinimapChange}
              ariaLabel={t('appearanceSettings.codeEditor.showMinimap.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.lineNumbers.label')}
            description={t('appearanceSettings.codeEditor.lineNumbers.description')}
          >
            <SettingsToggle
              checked={codeEditorSettings.lineNumbers}
              onChange={onCodeEditorLineNumbersChange}
              ariaLabel={t('appearanceSettings.codeEditor.lineNumbers.label')}
            />
          </SettingsRow>

          <SettingsRow
            label={t('appearanceSettings.codeEditor.fontSize.label')}
            description={t('appearanceSettings.codeEditor.fontSize.description')}
          >
            <select
              value={codeEditorSettings.fontSize}
              onChange={(event) => onCodeEditorFontSizeChange(event.target.value)}
              className="w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground touch-manipulation focus:border-primary focus:ring-1 focus:ring-primary sm:w-28"
            >
              <option value="10">10px</option>
              <option value="11">11px</option>
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="15">15px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
            </select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
