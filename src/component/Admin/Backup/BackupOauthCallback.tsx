import { Box, Container } from "@mui/material";
import { useSnackbar } from "notistack";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { finishBackupOauthCallback } from "../../../api/api";
import { useAppDispatch } from "../../../redux/hooks";
import { useQuery } from "../../../util";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import PageContainer from "../../Pages/PageContainer";
import PageHeader from "../../Pages/PageHeader";

// Google Drive 备份授权回调页：把 Google 返回的 code/state 交给后端换取刷新令牌，完成后回到备份页面的账号页签
const BackupOauthCallback = () => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const query = useQuery();

  useEffect(() => {
    const backupUrl = "/admin/backup?tab=account";
    const code = query.get("code");
    const state = query.get("state");
    if (code && state) {
      dispatch(finishBackupOauthCallback({ code, state }))
        .then(() => {
          enqueueSnackbar(t("backup.authorizeSuccess"), {
            variant: "success",
            action: DefaultCloseAction,
          });
        })
        .catch(() => {})
        .finally(() => navigate(backupUrl));
    } else {
      // 用户拒绝授权时 Google 会回传 error 参数
      enqueueSnackbar(t("backup.oauthCallbackFailed", { error: query.get("error") ?? "" }), {
        variant: "error",
        action: DefaultCloseAction,
      });
      navigate(backupUrl);
    }
  }, []);

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <PageHeader title={t("dashboard:nav.backup")} />
      </Container>

      <Box
        sx={{
          pt: 15,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <FacebookCircularProgress />
      </Box>
    </PageContainer>
  );
};

export default BackupOauthCallback;
