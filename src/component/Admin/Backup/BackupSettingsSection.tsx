import { FormControl, FormControlLabel, Link, Switch, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { DenseFilledTextField } from "../../Common/StyledComponents";
import SettingForm from "../../Pages/Setting/SettingForm";
import MultiplePolicySelectionInput from "../Group/EditGroup/MultiplePolicySelectionInput";
import { NoMarginHelperText, SettingSection, SettingSectionContent, StyledInputAdornment } from "../Settings/Settings";
import { SettingContext } from "../Settings/SettingWrapper";

const parsePolicies = (raw?: string): number[] => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
};

// 备份范围与计划：定时开关、存储策略、执行时间与快照保留天数
const BackupSettingsSection = () => {
  const { t } = useTranslation("dashboard");
  const { setSettings, values } = useContext(SettingContext);

  const policies = useMemo(() => parsePolicies(values.gdrive_backup_policies), [values.gdrive_backup_policies]);

  return (
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
      </SettingSectionContent>
    </SettingSection>
  );
};

export default BackupSettingsSection;
