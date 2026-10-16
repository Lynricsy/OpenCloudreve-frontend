import { Box, FormControl, FormControlLabel, Link, Stack, Switch, Typography } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { getBackupStatus } from "../../../../api/api";
import type { BackupStatus } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { DenseFilledTextField } from "../../../Common/StyledComponents";
import SettingForm from "../../../Pages/Setting/SettingForm";
import MultiplePolicySelectionInput from "../../Group/EditGroup/MultiplePolicySelectionInput";
import { NoMarginHelperText, SettingSection, SettingSectionContent, StyledInputAdornment } from "../Settings";
import { SettingContext } from "../SettingWrapper";
import AccountSection from "./AccountSection";
import EncryptionSection from "./EncryptionSection";
import RunStatusSection from "./RunStatusSection";
import SnapshotSection from "./SnapshotSection";

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

const Backup = () => {
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

        <RunStatusSection status={status} loading={statusLoading} onRefresh={refreshStatus} />

        <SnapshotSection authorized={!!status?.authorized} />
      </Stack>
    </Box>
  );
};

export default Backup;
