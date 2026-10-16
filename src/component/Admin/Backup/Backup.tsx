import { Box, Container, FormControl, FormControlLabel, Link, Stack, Switch, Typography } from "@mui/material";
import { useQueryState } from "nuqs";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { getBackupStatus } from "../../../api/api";
import type { BackupStatus } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import ResponsiveTabs, { Tab } from "../../Common/ResponsiveTabs";
import { DenseFilledTextField } from "../../Common/StyledComponents";
import HistoryOutlined from "../../Icons/HistoryOutlined";
import SettingsOutlined from "../../Icons/SettingsOutlined";
import PageContainer from "../../Pages/PageContainer";
import PageHeader, { PageTabQuery } from "../../Pages/PageHeader";
import SettingForm from "../../Pages/Setting/SettingForm";
import MultiplePolicySelectionInput from "../Group/EditGroup/MultiplePolicySelectionInput";
import { NoMarginHelperText, SettingSection, SettingSectionContent, StyledInputAdornment } from "../Settings/Settings";
import SettingsWrapper, { SettingContext } from "../Settings/SettingWrapper";
import AccountSection from "./AccountSection";
import BackupHistory from "./BackupHistory";
import EncryptionSection from "./EncryptionSection";
import RunStatusSection from "./RunStatusSection";
import SnapshotSection from "./SnapshotSection";

export enum BackupPageTab {
  Settings = "settings",
  History = "history",
}

// 备份任务运行时状态轮询间隔
const runningPollInterval = 5000;

const parsePolicies = (raw?: string): number[] => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
};

export interface BackupProps {
  // 切换到“运行记录”页签
  onViewHistory: () => void;
}

const Backup = ({ onViewHistory }: BackupProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { formRef, setSettings, values } = useContext(SettingContext);
  const [status, setStatus] = useState<BackupStatus | undefined>(undefined);
  const [statusLoading, setStatusLoading] = useState(true);

  const refreshStatus = useCallback(() => {
    setStatusLoading(true);
    dispatch(getBackupStatus())
      .then((res) => setStatus(res))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [dispatch]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // 有备份任务在执行时定时静默刷新状态，任务结束后停止
  useEffect(() => {
    if (!status?.running) {
      return;
    }
    const timer = setInterval(() => {
      dispatch(getBackupStatus())
        .then((res) => setStatus(res))
        .catch(() => {});
    }, runningPollInterval);
    return () => clearInterval(timer);
  }, [status?.running, dispatch]);

  const policies = useMemo(() => parsePolicies(values.gdrive_backup_policies), [values.gdrive_backup_policies]);

  return (
    <Box component={"form"} ref={formRef} onSubmit={(e) => e.preventDefault()}>
      <Stack spacing={5}>
        <AccountSection status={status} loading={statusLoading} onRefresh={refreshStatus} />

        <SettingSection>
          <Typography variant="h6" gutterBottom>
            {t("backup.backupSettings")}
          </Typography>
          <SettingSectionContent>
            <SettingForm lgWidth={5}>
              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.gdrive_backup_enabled === "1"}
                      onChange={(e) => setSettings({ gdrive_backup_enabled: e.target.checked ? "1" : "0" })}
                    />
                  }
                  label={t("backup.enable")}
                />
                <NoMarginHelperText>{t("backup.enableDes")}</NoMarginHelperText>
              </FormControl>
            </SettingForm>
            <SettingForm title={t("backup.policies")} lgWidth={5}>
              <MultiplePolicySelectionInput
                value={policies}
                exclude={0}
                onChange={(v) => setSettings({ gdrive_backup_policies: JSON.stringify(v) })}
              />
              <NoMarginHelperText>{t("backup.policiesDes")}</NoMarginHelperText>
              <NoMarginHelperText>{t("backup.slavePoliciesDes")}</NoMarginHelperText>
            </SettingForm>
            <SettingForm title={t("backup.cron")} lgWidth={5}>
              <FormControl fullWidth>
                <DenseFilledTextField
                  required
                  value={values.cron_gdrive_backup ?? ""}
                  placeholder={"0 3 * * *"}
                  onChange={(e) => setSettings({ cron_gdrive_backup: e.target.value })}
                />
                <NoMarginHelperText>
                  <Trans
                    i18nKey="backup.cronDes"
                    ns={"dashboard"}
                    components={[<Link href="https://crontab.guru/" target="_blank" rel="noopener noreferrer" />]}
                  />
                </NoMarginHelperText>
              </FormControl>
            </SettingForm>
            <SettingForm title={t("backup.retentionDays")} lgWidth={5}>
              <FormControl fullWidth>
                <DenseFilledTextField
                  required
                  value={values.gdrive_backup_retention_days ?? ""}
                  onChange={(e) => setSettings({ gdrive_backup_retention_days: e.target.value })}
                  slotProps={{
                    input: {
                      type: "number",
                      inputProps: {
                        min: 1,
                        step: 1,
                      },
                      endAdornment: (
                        <StyledInputAdornment disableTypography position="end">
                          {t("backup.days")}
                        </StyledInputAdornment>
                      ),
                    },
                  }}
                />
                <NoMarginHelperText>{t("backup.retentionDaysDes")}</NoMarginHelperText>
              </FormControl>
            </SettingForm>
            <SettingForm title={t("backup.proxy")} lgWidth={5}>
              <FormControl fullWidth>
                <DenseFilledTextField
                  value={values.gdrive_backup_proxy ?? ""}
                  placeholder={"http://127.0.0.1:7890"}
                  onChange={(e) => setSettings({ gdrive_backup_proxy: e.target.value })}
                />
                <NoMarginHelperText>{t("backup.proxyDes")}</NoMarginHelperText>
              </FormControl>
            </SettingForm>
          </SettingSectionContent>
        </SettingSection>

        <EncryptionSection status={status} />

        <RunStatusSection
          status={status}
          loading={statusLoading}
          onRefresh={refreshStatus}
          onViewHistory={onViewHistory}
        />

        <SnapshotSection authorized={!!status?.authorized} />
      </Stack>
    </Box>
  );
};

// 后台侧边栏“备份”页面：设置页签中的备份设置项由 SettingsWrapper 统一读取与保存，运行记录页签列出备份/恢复任务
const BackupPage = () => {
  const { t } = useTranslation("dashboard");
  const [tab, setTab] = useQueryState(PageTabQuery);

  const tabs: Tab<BackupPageTab>[] = useMemo(
    () => [
      {
        label: t("backup.settingsTab"),
        value: BackupPageTab.Settings,
        icon: <SettingsOutlined />,
      },
      {
        label: t("backup.historyTab"),
        value: BackupPageTab.History,
        icon: <HistoryOutlined />,
      },
    ],
    [t],
  );

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <PageHeader title={t("nav.backup")} />
        <ResponsiveTabs
          value={tab ?? BackupPageTab.Settings}
          onChange={(_e, newValue) => setTab(newValue)}
          tabs={tabs}
        />
        <SwitchTransition>
          <CSSTransition
            addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
            classNames="fade"
            key={`${tab}`}
          >
            <Box>
              {(!tab || tab === BackupPageTab.Settings) && (
                <SettingsWrapper
                  settings={[
                    "gdrive_backup_enabled",
                    "gdrive_backup_client_id",
                    "gdrive_backup_client_secret",
                    "gdrive_backup_policies",
                    "gdrive_backup_retention_days",
                    "gdrive_backup_encrypt",
                    "gdrive_backup_key",
                    "gdrive_backup_proxy",
                    "cron_gdrive_backup",
                  ]}
                >
                  <Backup onViewHistory={() => setTab(BackupPageTab.History)} />
                </SettingsWrapper>
              )}
              {tab === BackupPageTab.History && <BackupHistory />}
            </Box>
          </CSSTransition>
        </SwitchTransition>
      </Container>
    </PageContainer>
  );
};

export default BackupPage;
