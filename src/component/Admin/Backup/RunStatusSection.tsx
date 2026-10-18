import { LoadingButton } from "@mui/lab";
import { Alert, AlertTitle, Box, Button, Grid2, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import type { TFunction } from "i18next";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { runBackup } from "../../../api/api";
import { BackupPlainKeyID } from "../../../api/dashboard";
import type { BackupLastTask, BackupStatus } from "../../../api/dashboard";
import { TaskStatus } from "../../../api/workflow";
import { useAppDispatch } from "../../../redux/hooks";
import { sizeToString } from "../../../util";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import { SecondaryButton } from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import ArrowClockwise from "../../Icons/ArrowClockwise";
import ArrowSync from "../../Icons/ArrowSync";
import BinFullOutlined from "../../Icons/BinFullOutlined";
import CheckCircleFilled from "../../Icons/CheckCircleFilled";
import ClockFilled from "../../Icons/ClockFilled";
import CloudArrowIUp from "../../Icons/CloudArrowIUp";
import DismissCircleFilled from "../../Icons/DismissCircleFilled";
import DocumentCopyFilled from "../../Icons/DocumentCopyFilled";
import HardDrive from "../../Icons/HardDrive";
import HistoryOutlined from "../../Icons/HistoryOutlined";
import LockClosedOutlined from "../../Icons/LockClosedOutlined";
import PersonOutlined from "../../Icons/PersonOutlined";
import Play from "../../Icons/Play";
import Timer from "../../Icons/Timer";
import Warning from "../../Icons/Warning";
import { getTaskStatusText } from "../../Pages/Tasks/TaskProps";
import { formatWallDuration, getTriggerText } from "./backupHistoryUtils";
import { BackupCard, BackupCardHeader, BackupPageTab, BackupTone, middleEllipsis, StatTile } from "./BackupUi";

export interface RunStatusSectionProps {
  status?: BackupStatus;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: BackupPageTab) => void;
}

// 根据运行状态与上次任务结果选择概览卡片的标题、图标与色调
const overallState = (status: BackupStatus, t: TFunction): { tone: BackupTone; icon: JSX.Element; title: string } => {
  const last = status.last_task;
  if (status.running) {
    return { tone: "primary", icon: <CloudArrowIUp />, title: t("backup.running") };
  }
  if (last?.status === TaskStatus.error) {
    return { tone: "error", icon: <DismissCircleFilled />, title: t("backup.lastFailed") };
  }
  if (last?.status === TaskStatus.completed) {
    const failed = last.summary?.failed ?? 0;
    return failed > 0
      ? { tone: "warning", icon: <Warning />, title: t("backup.lastPartial", { count: failed }) }
      : { tone: "success", icon: <CheckCircleFilled />, title: t("backup.lastSucceeded") };
  }
  return { tone: "neutral", icon: <ClockFilled />, title: t("backup.idle") };
};

const LastTaskStats = ({ task }: { task: BackupLastTask }) => {
  const { t } = useTranslation("dashboard");
  const s = task.summary ?? ({} as BackupLastTask["summary"]);
  const failed = s.failed ?? 0;
  const pending = s.pending ?? 0;
  const deferred = s.deferred ?? 0;
  const skipped = [
    pending > 0 ? `${t("application:setting.gdrivePending")} ${pending.toLocaleString()}` : "",
    deferred > 0 ? `${t("application:setting.gdriveDeferred")} ${deferred.toLocaleString()}` : "",
  ].filter((v) => v);
  const tiles = [
    {
      icon: <DocumentCopyFilled />,
      label: t("application:setting.gdriveFiles"),
      value: (s.files ?? 0).toLocaleString(),
      hint: sizeToString(s.size ?? 0),
    },
    {
      icon: <CloudArrowIUp />,
      label: t("application:setting.gdriveUploaded"),
      value: (s.uploaded ?? 0).toLocaleString(),
      hint: sizeToString(s.uploaded_size ?? 0),
      tone: (s.uploaded ?? 0) > 0 ? ("primary" as const) : undefined,
    },
    {
      icon: <ArrowSync />,
      label: t("application:setting.gdriveReused"),
      value: (s.reused ?? 0).toLocaleString(),
    },
    {
      icon: <DismissCircleFilled />,
      label: t("application:setting.gdriveFailed"),
      value: failed.toLocaleString(),
      hint: skipped.length > 0 ? skipped.join(" · ") : undefined,
      tone: failed > 0 ? ("error" as const) : undefined,
    },
    {
      icon: <Timer />,
      label: t("backup.history.duration"),
      value: formatWallDuration(task),
    },
    {
      icon: <BinFullOutlined />,
      label: t("backup.cleanup"),
      value: `${(s.deleted_snapshots ?? 0).toLocaleString()} / ${(s.deleted_blobs ?? 0).toLocaleString()}`,
      hint: t("backup.cleanupDes"),
    },
  ];
  return (
    <Grid2 container spacing={1.5}>
      {tiles.map((tile) => (
        <Grid2 key={tile.label} size={{ xs: 6, sm: 4, lg: 2 }}>
          <StatTile {...tile} />
        </Grid2>
      ))}
    </Grid2>
  );
};

const RunStatusSection = ({ status, loading, onRefresh, onNavigate }: RunStatusSectionProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [starting, setStarting] = useState(false);

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

  if (!status) {
    return (
      <Box sx={{ pt: 10, display: "flex", justifyContent: "center" }}>
        {loading ? <FacebookCircularProgress /> : null}
      </Box>
    );
  }

  const lastTask = status.last_task;
  const { tone, icon, title } = overallState(status, t);
  const encrypted = !!status.key_id && status.key_id !== BackupPlainKeyID;
  const quota = status.quota;
  const quotaPercent = quota && quota.limit > 0 ? Math.min(100, (quota.usage / quota.limit) * 100) : undefined;

  return (
    <Stack spacing={2}>
      <BackupCard>
        <BackupCardHeader
          dense={!status.running && status.authorized}
          icon={icon}
          tone={tone}
          title={title}
          subtitle={
            lastTask ? (
              <>
                <TimeBadge variant="inherit" datetime={lastTask.created_at} />
                {" · "}
                {getTaskStatusText(lastTask.status as TaskStatus, t)}
                {lastTask.summary?.trigger && ` · ${getTriggerText(lastTask.summary.trigger, t)}`}
              </>
            ) : (
              t("backup.noTaskYet")
            )
          }
          action={
            <>
              <Tooltip title={status.authorized ? t("backup.runNowDes") : t("backup.runNowNeedAuth")}>
                <span>
                  <LoadingButton
                    variant="contained"
                    disableElevation
                    startIcon={<Play />}
                    loading={starting}
                    disabled={!status.authorized || status.running}
                    onClick={run}
                  >
                    <span>{t("backup.runNow")}</span>
                  </LoadingButton>
                </span>
              </Tooltip>
              <SecondaryButton
                variant="contained"
                startIcon={<ArrowClockwise />}
                disabled={loading}
                onClick={onRefresh}
              >
                {t("backup.refresh")}
              </SecondaryButton>
              <SecondaryButton
                variant="contained"
                startIcon={<HistoryOutlined />}
                onClick={() => onNavigate(BackupPageTab.History)}
              >
                {t("backup.viewHistory")}
              </SecondaryButton>
            </>
          }
        />
        {status.running && <LinearProgress sx={{ borderRadius: 1 }} />}
        {!status.authorized && (
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={() => onNavigate(BackupPageTab.Account)}>
                {t("backup.goConnect")}
              </Button>
            }
          >
            {t("backup.runNowNeedAuth")}
          </Alert>
        )}
      </BackupCard>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <BackupCard>
            <BackupCardHeader
              icon={<PersonOutlined />}
              tone={status.authorized ? (status.account_error ? "error" : "success") : "warning"}
              title={t("backup.googleAccount")}
              subtitle={
                status.authorized
                  ? status.account
                    ? `${status.account.name} · ${status.account.email}`
                    : status.account_error
                      ? t("backup.accountError")
                      : t("backup.connected")
                  : t("backup.notConnected")
              }
              dense
            />
            <Box sx={{ mt: 1.5 }}>
              <Button size="small" onClick={() => onNavigate(BackupPageTab.Account)}>
                {t("backup.manage")}
              </Button>
            </Box>
          </BackupCard>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <BackupCard>
            <BackupCardHeader
              icon={<HardDrive />}
              tone={quotaPercent !== undefined && quotaPercent >= 90 ? "warning" : "neutral"}
              title={t("backup.storageQuota")}
              subtitle={
                quota
                  ? quota.limit > 0
                    ? t("backup.quotaUsage", { used: sizeToString(quota.usage), total: sizeToString(quota.limit) })
                    : t("backup.quotaUnlimited", { used: sizeToString(quota.usage) })
                  : t("backup.quotaUnavailable")
              }
              dense
            />
            {quotaPercent !== undefined && (
              <LinearProgress
                variant="determinate"
                value={quotaPercent}
                color={quotaPercent >= 90 ? "warning" : "primary"}
                sx={{ mt: 2.5, height: 6, borderRadius: 3 }}
              />
            )}
          </BackupCard>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <BackupCard>
            <BackupCardHeader
              icon={<LockClosedOutlined />}
              tone={encrypted ? "success" : "neutral"}
              title={t("backup.encryption")}
              subtitle={
                encrypted ? (
                  <span title={status.key_id}>
                    {t("backup.encryptionOn")} · {middleEllipsis(status.key_id)}
                  </span>
                ) : (
                  t("backup.encryptionOff")
                )
              }
              dense
            />
            <Box sx={{ mt: 1.5 }}>
              <Button size="small" onClick={() => onNavigate(BackupPageTab.Encryption)}>
                {t("backup.manage")}
              </Button>
            </Box>
          </BackupCard>
        </Grid2>
      </Grid2>

      {/* 运行中的任务统计尚未完成，等结束后再展示 */}
      {lastTask && !status.running && (
        <BackupCard>
          <BackupCardHeader
            icon={<HistoryOutlined />}
            title={t("backup.lastTask")}
            subtitle={lastTask.summary?.snapshot ?? <TimeBadge variant="inherit" datetime={lastTask.created_at} />}
          />
          <Stack spacing={2}>
            <LastTaskStats task={lastTask} />
            {lastTask.error && (
              <Alert severity="error">
                <AlertTitle>{t("task.errorMsg")}</AlertTitle>
                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                  {lastTask.error}
                </Typography>
              </Alert>
            )}
            {!!lastTask.summary?.errors?.length && (
              <Alert severity="warning">
                <AlertTitle>{t("backup.fileErrors", { count: lastTask.summary.errors.length })}</AlertTitle>
                <Box
                  component="ul"
                  sx={{ paddingInlineStart: "20px", m: 0, maxHeight: 200, overflowY: "auto", overflowWrap: "anywhere" }}
                >
                  {lastTask.summary.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </Box>
              </Alert>
            )}
          </Stack>
        </BackupCard>
      )}
    </Stack>
  );
};

export default RunStatusSection;
