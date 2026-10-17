import { Alert, FormControl, Grid2, Link, Stack, Switch } from "@mui/material";
import { useContext, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { DenseFilledTextField, SquareChip } from "../../Common/StyledComponents";
import Archive from "../../Icons/Archive";
import CalendarClock from "../../Icons/CalendarClock";
import StorageOutlined from "../../Icons/StorageOutlined";
import SettingForm from "../../Pages/Setting/SettingForm";
import MultiplePolicySelectionInput from "../Group/EditGroup/MultiplePolicySelectionInput";
import { NoMarginHelperText, StyledInputAdornment } from "../Settings/Settings";
import { SettingContext } from "../Settings/SettingWrapper";
import { BackupCard, BackupCardHeader } from "./BackupUi";

const parsePolicies = (raw?: string): number[] => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
};

// 备份范围与计划：定时开关、执行时间、存储策略与快照保留天数
const BackupSettingsSection = () => {
  const { t } = useTranslation("dashboard");
  const { setSettings, values } = useContext(SettingContext);

  const policies = useMemo(() => parsePolicies(values.gdrive_backup_policies), [values.gdrive_backup_policies]);
  const enabled = values.gdrive_backup_enabled === "1";

  return (
    <Stack spacing={2}>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <BackupCard>
            <BackupCardHeader
              icon={<CalendarClock />}
              tone={enabled ? "primary" : "neutral"}
              title={
                <Stack direction="row" spacing={1} alignItems="center" component="span">
                  <span>{t("backup.schedule")}</span>
                  <SquareChip
                    size="small"
                    variant="outlined"
                    color={enabled ? "success" : "default"}
                    label={enabled ? t("backup.enabledChip") : t("backup.disabledChip")}
                  />
                </Stack>
              }
              subtitle={t("backup.enableDes")}
              action={
                <Switch
                  checked={enabled}
                  inputProps={{ "aria-label": t("backup.enable") }}
                  onChange={(e) => setSettings({ gdrive_backup_enabled: e.target.checked ? "1" : "0" })}
                />
              }
            />
            <SettingForm title={t("backup.cron")} lgWidth={12}>
              <FormControl fullWidth>
                <DenseFilledTextField
                  required
                  value={values.cron_gdrive_backup ?? ""}
                  placeholder={"0 3 * * *"}
                  onChange={(e) => setSettings({ cron_gdrive_backup: e.target.value })}
                  slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: "monospace" } } }}
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
          </BackupCard>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <BackupCard>
            <BackupCardHeader
              icon={<Archive />}
              title={t("backup.retention")}
              subtitle={t("backup.retentionDaysDes")}
            />
            <SettingForm title={t("backup.retentionDays")} lgWidth={12}>
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
              </FormControl>
            </SettingForm>
          </BackupCard>
        </Grid2>
      </Grid2>

      <BackupCard>
        <BackupCardHeader
          icon={<StorageOutlined />}
          tone={policies.length > 0 ? "primary" : "warning"}
          title={t("backup.scope")}
          subtitle={policies.length > 0 ? t("backup.policiesDes") : t("backup.noPolicySelected")}
        />
        <Stack spacing={2}>
          <SettingForm title={t("backup.policies")} lgWidth={12}>
            <MultiplePolicySelectionInput
              value={policies}
              exclude={0}
              onChange={(v) => setSettings({ gdrive_backup_policies: JSON.stringify(v) })}
            />
          </SettingForm>
          <Alert severity="info">{t("backup.slavePoliciesDes")}</Alert>
        </Stack>
      </BackupCard>
    </Stack>
  );
};

export default BackupSettingsSection;
