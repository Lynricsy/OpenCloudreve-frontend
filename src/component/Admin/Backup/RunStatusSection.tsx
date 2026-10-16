import { Alert, AlertTitle, Box, Grid2, Link, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { runBackup } from "../../../api/api";
import type { BackupStatus } from "../../../api/dashboard";
import { TaskType } from "../../../api/workflow";
import type { TaskStatus } from "../../../api/workflow";
import { useAppDispatch } from "../../../redux/hooks";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import { SecondaryButton, SecondaryLoadingButton, SquareChip } from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import ArrowClockwise from "../../Icons/ArrowClockwise";
import Play from "../../Icons/Play";
import SettingForm from "../../Pages/Setting/SettingForm";
import { getGDriveTaskStats, getTaskStatusText } from "../../Pages/Tasks/TaskProps";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../Settings/Settings";

export interface RunStatusSectionProps {
  status?: BackupStatus;
  loading: boolean;
  onRefresh: () => void;
}

const RunStatusSection = ({ status, loading, onRefresh }: RunStatusSectionProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [starting, setStarting] = useState(false);

  const lastTask = status?.last_task;

  const run = () => {
    setStarting(true);
    dispatch(runBackup())
      .then(() => {
        enqueueSnackbar(t("backup.backupTaskCreated"), { variant: "success", action: DefaultCloseAction });
        onRefresh();
      })
      .catch(() => {})
      .finally(() => setStarting(false));
  };

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("backup.runStatus")}
      </Typography>
      <SettingSectionContent>
        {loading && !status && <FacebookCircularProgress size={30} />}
        {status && (
          <>
            <SettingForm title={t("backup.currentState")} lgWidth={5}>
              <SquareChip
                size="small"
                color={status.running ? "primary" : "default"}
                label={status.running ? t("backup.running") : t("backup.idle")}
              />
            </SettingForm>
            <SettingForm title={t("backup.lastTask")} lgWidth={8}>
              {!lastTask && (
                <Typography variant="body2" color="text.secondary">
                  {t("backup.noTaskYet")}
                </Typography>
              )}
              {lastTask && (
                <Stack spacing={1.5}>
                  <Grid2 container spacing={1}>
                    <Grid2 size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t("task.status")}
                      </Typography>
                      <Typography variant="body2">{getTaskStatusText(lastTask.status as TaskStatus, t)}</Typography>
                    </Grid2>
                    <Grid2 size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t("user.createdAt")}
                      </Typography>
                      <Typography variant="body2">
                        <TimeBadge variant="inherit" datetime={lastTask.created_at} />
                      </Typography>
                    </Grid2>
                    <Grid2 size={{ xs: 6, md: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        {t("task.updatedAt")}
                      </Typography>
                      <Typography variant="body2">
                        <TimeBadge variant="inherit" datetime={lastTask.updated_at} />
                      </Typography>
                    </Grid2>
                    {getGDriveTaskStats(TaskType.gdrive_backup, { props: { ...lastTask.summary } }, t).map((stat) => (
                      <Grid2 key={stat.label} size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                          {stat.label}
                        </Typography>
                        <Typography variant="body2">{stat.value}</Typography>
                      </Grid2>
                    ))}
                  </Grid2>
                  {lastTask.error && (
                    <Alert severity="error" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
                      <AlertTitle>{t("task.errorMsg")}</AlertTitle>
                      {lastTask.error}
                    </Alert>
                  )}
                  {!!lastTask.summary?.errors?.length && (
                    <Alert severity="warning" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
                      <AlertTitle>{t("backup.fileErrors", { count: lastTask.summary.errors.length })}</AlertTitle>
                      <Box
                        component="ul"
                        sx={{
                          paddingInlineStart: "20px",
                          m: 0,
                          maxHeight: 200,
                          overflowY: "auto",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {lastTask.summary.errors.map((err, index) => (
                          <li key={index}>{err}</li>
                        ))}
                      </Box>
                    </Alert>
                  )}
                </Stack>
              )}
            </SettingForm>
            <SettingForm lgWidth={5}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <SecondaryLoadingButton
                  variant="contained"
                  startIcon={<Play />}
                  loading={starting}
                  disabled={!status.authorized || status.running}
                  onClick={run}
                >
                  <span>{t("backup.runNow")}</span>
                </SecondaryLoadingButton>
                <SecondaryButton
                  variant="contained"
                  startIcon={<ArrowClockwise />}
                  disabled={loading}
                  onClick={onRefresh}
                >
                  {t("backup.refresh")}
                </SecondaryButton>
              </Box>
              <NoMarginHelperText>
                {status.authorized ? t("backup.runNowDes") : t("backup.runNowNeedAuth")}{" "}
                <Link component={RouterLink} to="/admin/task" underline="hover">
                  {t("backup.viewTasks")}
                </Link>
              </NoMarginHelperText>
            </SettingForm>
          </>
        )}
      </SettingSectionContent>
    </SettingSection>
  );
};

export default RunStatusSection;
