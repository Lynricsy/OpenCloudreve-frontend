import { LoadingButton } from "@mui/lab";
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  FormControl,
  Grid2,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { disconnectBackupAccount, getBackupOauthUrl, sendSetSetting } from "../../../api/api";
import type { BackupStatus } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import { confirmOperation } from "../../../redux/thunks/dialog";
import { copyToClipboard, sizeToString } from "../../../util";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import { DenseFilledTextField, SquareChip } from "../../Common/StyledComponents";
import CopyOutlined from "../../Icons/CopyOutlined";
import Eye from "../../Icons/Eye";
import EyeOff from "../../Icons/EyeOff";
import Globe from "../../Icons/Globe";
import Info from "../../Icons/Info";
import LinkOutlined from "../../Icons/LinkOutlined";
import PersonOutlined from "../../Icons/PersonOutlined";
import SettingForm from "../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../Settings/Settings";
import { SettingContext } from "../Settings/SettingWrapper";
import { BackupCard, BackupCardHeader } from "./BackupUi";

export interface AccountSectionProps {
  status?: BackupStatus;
  loading: boolean;
  onRefresh: () => void;
}

// 授权状态卡片：已连接时展示账号与空间用量，未连接时引导登录
const ConnectionCard = ({
  status,
  loading,
  signingIn,
  disconnecting,
  onSignIn,
  onDisconnect,
}: {
  status?: BackupStatus;
  loading: boolean;
  signingIn: boolean;
  disconnecting: boolean;
  onSignIn: () => void;
  onDisconnect: () => void;
}) => {
  const { t } = useTranslation("dashboard");

  if (!status) {
    return (
      <BackupCard>
        <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
          {loading && <FacebookCircularProgress size={30} />}
        </Box>
      </BackupCard>
    );
  }

  const account = status.account;
  const quota = status.quota;
  const quotaPercent = quota && quota.limit > 0 ? Math.min(100, (quota.usage / quota.limit) * 100) : undefined;
  const actions = (
    <>
      <LoadingButton
        variant={status.authorized ? "outlined" : "contained"}
        disableElevation
        onClick={onSignIn}
        loading={signingIn}
      >
        <span>{t(status.authorized ? "backup.authorizeAgain" : "backup.signIn")}</span>
      </LoadingButton>
      {status.authorized && (
        <LoadingButton color="error" onClick={onDisconnect} loading={disconnecting}>
          <span>{t("backup.disconnect")}</span>
        </LoadingButton>
      )}
    </>
  );

  return (
    <BackupCard>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            sx={(theme) => ({
              width: 48,
              height: 48,
              fontWeight: 600,
              bgcolor: status.authorized ? theme.palette.primary.main : theme.palette.action.selected,
              color: status.authorized ? theme.palette.primary.contrastText : theme.palette.text.secondary,
            })}
          >
            {account?.name ? Array.from(account.name.trim())[0]?.toUpperCase() : <PersonOutlined />}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle1" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                {account?.name ?? (status.authorized ? t("backup.connected") : t("backup.notConnected"))}
              </Typography>
              <SquareChip
                size="small"
                color={status.authorized ? (status.account_error ? "error" : "success") : "default"}
                variant="outlined"
                label={
                  status.authorized
                    ? status.account_error
                      ? t("backup.accountError")
                      : t("backup.connectedChip")
                    : t("backup.notConnectedChip")
                }
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {account?.email ?? (status.authorized ? "" : t("backup.connectHint"))}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>{actions}</Box>
      </Stack>

      {status.authorized && quota && (
        <Box sx={{ mt: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {t("backup.storageQuota")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {quota.limit > 0
                ? t("backup.quotaUsage", { used: sizeToString(quota.usage), total: sizeToString(quota.limit) })
                : t("backup.quotaUnlimited", { used: sizeToString(quota.usage) })}
            </Typography>
          </Stack>
          {quotaPercent !== undefined && (
            <LinearProgress
              variant="determinate"
              value={quotaPercent}
              color={quotaPercent >= 90 ? "warning" : "primary"}
              sx={{ height: 6, borderRadius: 3 }}
            />
          )}
        </Box>
      )}

      {status.account_error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>{t("backup.accountError")}</AlertTitle>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
            {status.account_error}
          </Typography>
        </Alert>
      )}
    </BackupCard>
  );
};

// 配置步骤：带序号圆点的有序列表
const SetupSteps = () => {
  const { t } = useTranslation("dashboard");
  const steps = t("backup.googleSetupSteps", { returnObjects: true }) as string[];
  return (
    <Stack component="ol" spacing={2} sx={{ m: 0, p: 0, listStyle: "none" }}>
      {steps.map((step, index) => (
        <Stack component="li" key={index} direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: theme.typography.caption.fontSize,
              fontWeight: 600,
              color: theme.palette.primary.main,
              border: `1px solid ${theme.palette.primary.main}`,
            })}
          >
            {index + 1}
          </Box>
          <Typography variant="body2" sx={{ pt: 0.25 }}>
            {step}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
};

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
    <Stack spacing={2}>
      <ConnectionCard
        status={status}
        loading={loading}
        signingIn={signingIn}
        disconnecting={disconnecting}
        onSignIn={signIn}
        onDisconnect={disconnect}
      />

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, lg: 7 }}>
          <BackupCard>
            <BackupCardHeader
              icon={<LinkOutlined />}
              title={t("backup.oauthClient")}
              subtitle={t("backup.signInDes")}
            />
            <Stack spacing={3}>
              <SettingForm title={t("backup.redirectUri")} lgWidth={12}>
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
                              aria-label={t("backup.copy")}
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
              <SettingForm title={t("backup.clientId")} lgWidth={12}>
                <FormControl fullWidth>
                  <DenseFilledTextField
                    value={values.gdrive_backup_client_id ?? ""}
                    onChange={(e) => setSettings({ gdrive_backup_client_id: e.target.value })}
                  />
                  <NoMarginHelperText>{t("backup.clientIdDes")}</NoMarginHelperText>
                </FormControl>
              </SettingForm>
              <SettingForm title={t("backup.clientSecret")} lgWidth={12}>
                <FormControl fullWidth>
                  <DenseFilledTextField
                    type={showSecret ? "text" : "password"}
                    value={values.gdrive_backup_client_secret ?? ""}
                    onChange={(e) => setSettings({ gdrive_backup_client_secret: e.target.value })}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              aria-label={t("backup.toggleVisibility")}
                              onClick={() => setShowSecret((s) => !s)}
                            >
                              {showSecret ? <EyeOff fontSize="small" /> : <Eye fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </FormControl>
              </SettingForm>
              <SettingForm
                title={
                  <>
                    <Globe sx={{ fontSize: 16, mr: 0.75, color: "text.secondary" }} />
                    {t("backup.proxy")}
                  </>
                }
                lgWidth={12}
              >
                <FormControl fullWidth>
                  <DenseFilledTextField
                    value={values.gdrive_backup_proxy ?? ""}
                    placeholder={"http://127.0.0.1:7890"}
                    onChange={(e) => setSettings({ gdrive_backup_proxy: e.target.value })}
                  />
                  <NoMarginHelperText>{t("backup.proxyDes")}</NoMarginHelperText>
                </FormControl>
              </SettingForm>
            </Stack>
          </BackupCard>
        </Grid2>
        <Grid2 size={{ xs: 12, lg: 5 }}>
          <BackupCard>
            <BackupCardHeader icon={<Info />} tone="primary" title={t("backup.googleSetupTitle")} />
            <SetupSteps />
          </BackupCard>
        </Grid2>
      </Grid2>
    </Stack>
  );
};

export default AccountSection;
