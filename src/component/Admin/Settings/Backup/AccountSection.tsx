import { Alert, AlertTitle, Box, FormControl, IconButton, InputAdornment, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { disconnectBackupAccount, getBackupOauthUrl, sendSetSetting } from "../../../../api/api";
import type { BackupStatus } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { confirmOperation } from "../../../../redux/thunks/dialog";
import { copyToClipboard, sizeToString } from "../../../../util";
import FacebookCircularProgress from "../../../Common/CircularProgress";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar";
import { DenseFilledTextField, SecondaryLoadingButton } from "../../../Common/StyledComponents";
import CheckCircleFilled from "../../../Icons/CheckCircleFilled";
import CopyOutlined from "../../../Icons/CopyOutlined";
import DismissCircleFilled from "../../../Icons/DismissCircleFilled";
import Eye from "../../../Icons/Eye";
import EyeOff from "../../../Icons/EyeOff";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../Settings";
import { SettingContext } from "../SettingWrapper";

export interface AccountSectionProps {
  status?: BackupStatus;
  loading: boolean;
  onRefresh: () => void;
}

const AccountSection = ({ status, loading, onRefresh }: AccountSectionProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { setSettings, values } = useContext(SettingContext);
  const [showSecret, setShowSecret] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // 后端使用已保存的客户端凭据生成授权地址，因此跳转前先保存客户端 ID、密钥与代理
  const signIn = () => {
    if (!values.gdrive_backup_client_id || !values.gdrive_backup_client_secret) {
      enqueueSnackbar(t("backup.clientRequired"), { variant: "warning", action: DefaultCloseAction });
      return;
    }

    setSigningIn(true);
    dispatch(
      sendSetSetting({
        settings: {
          gdrive_backup_client_id: values.gdrive_backup_client_id,
          gdrive_backup_client_secret: values.gdrive_backup_client_secret,
          gdrive_backup_proxy: values.gdrive_backup_proxy ?? "",
        },
      }),
    )
      .then(() => dispatch(getBackupOauthUrl()))
      .then((url) => {
        window.location.assign(url);
      })
      .catch(() => {
        setSigningIn(false);
      });
  };

  const disconnect = () => {
    dispatch(confirmOperation(t("backup.disconnectConfirm")))
      .then(() => {
        setDisconnecting(true);
        return dispatch(disconnectBackupAccount())
          .then(() => onRefresh())
          .finally(() => setDisconnecting(false));
      })
      .catch(() => {});
  };

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("backup.googleAccount")}
      </Typography>
      <SettingSectionContent>
        <SettingForm lgWidth={5}>
          <Alert severity="info" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
            <AlertTitle>{t("backup.googleSetupTitle")}</AlertTitle>
            <ol style={{ paddingInlineStart: "20px", margin: 0 }}>
              {(t("backup.googleSetupSteps", { returnObjects: true }) as string[]).map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </Alert>
        </SettingForm>
        <SettingForm title={t("backup.redirectUri")} lgWidth={5}>
          <FormControl fullWidth>
            <DenseFilledTextField
              value={status?.redirect_uri ?? ""}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        disabled={!status?.redirect_uri}
                        onClick={() => copyToClipboard(status?.redirect_uri ?? "")}
                      >
                        <CopyOutlined fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <NoMarginHelperText>{t("backup.redirectUriDes")}</NoMarginHelperText>
          </FormControl>
        </SettingForm>
        <SettingForm title={t("backup.clientId")} lgWidth={5}>
          <FormControl fullWidth>
            <DenseFilledTextField
              value={values.gdrive_backup_client_id ?? ""}
              onChange={(e) => setSettings({ gdrive_backup_client_id: e.target.value })}
            />
            <NoMarginHelperText>{t("backup.clientIdDes")}</NoMarginHelperText>
          </FormControl>
        </SettingForm>
        <SettingForm title={t("backup.clientSecret")} lgWidth={5}>
          <FormControl fullWidth>
            <DenseFilledTextField
              type={showSecret ? "text" : "password"}
              value={values.gdrive_backup_client_secret ?? ""}
              onChange={(e) => setSettings({ gdrive_backup_client_secret: e.target.value })}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowSecret((s) => !s)}>
                        {showSecret ? <EyeOff fontSize="small" /> : <Eye fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </FormControl>
        </SettingForm>
        <SettingForm title={t("backup.authorizationStatus")} lgWidth={5}>
          {loading && !status && <FacebookCircularProgress size={30} />}
          {status && (
            <Stack spacing={1}>
              {status.authorized ? (
                <Typography variant="body2" color="success" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleFilled />
                  {status.account
                    ? t("backup.connectedAs", { name: status.account.name, email: status.account.email })
                    : t("backup.connected")}
                </Typography>
              ) : (
                <Typography variant="body2" color="warning" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DismissCircleFilled />
                  {t("backup.notConnected")}
                </Typography>
              )}
              {status.authorized && status.quota && (
                <Typography variant="body2" color="text.secondary">
                  {status.quota.limit > 0
                    ? t("backup.quotaUsage", {
                        used: sizeToString(status.quota.usage),
                        total: sizeToString(status.quota.limit),
                      })
                    : t("backup.quotaUnlimited", { used: sizeToString(status.quota.usage) })}
                </Typography>
              )}
              {status.account_error && (
                <Alert severity="error" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
                  <AlertTitle>{t("backup.accountError")}</AlertTitle>
                  {status.account_error}
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <SecondaryLoadingButton variant="contained" onClick={signIn} loading={signingIn}>
                  <span>{t(status.authorized ? "backup.authorizeAgain" : "backup.signIn")}</span>
                </SecondaryLoadingButton>
                {status.authorized && (
                  <SecondaryLoadingButton variant="contained" onClick={disconnect} loading={disconnecting}>
                    <span>{t("backup.disconnect")}</span>
                  </SecondaryLoadingButton>
                )}
              </Box>
              <NoMarginHelperText>{t("backup.signInDes")}</NoMarginHelperText>
            </Stack>
          )}
        </SettingForm>
      </SettingSectionContent>
    </SettingSection>
  );
};

export default AccountSection;
