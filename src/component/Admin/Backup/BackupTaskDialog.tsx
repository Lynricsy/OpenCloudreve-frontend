import {
  Alert,
  Box,
  DialogContent,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { getBackupSnapshots, getTaskDetail } from "../../../api/api";
import { BackupPlainKeyID } from "../../../api/dashboard";
import type {
  BackupSnapshot,
  GDriveBackupTaskState,
  GDriveRemoteNode,
  GDriveRestoreTaskState,
  GDriveTaskEvent,
  GDriveTaskEventLog,
  Task,
} from "../../../api/dashboard";
import { TaskStatus, TaskType } from "../../../api/workflow";
import { useAppDispatch } from "../../../redux/hooks";
import { copyToClipboard } from "../../../util";
import { formatDuration } from "../../../util/datetime";
import AutoHeight from "../../Common/AutoHeight";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import {
  NoWrapTableCell,
  SecondaryLoadingButton,
  SquareChip,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import DraggableDialog from "../../Dialogs/DraggableDialog";
import CopyOutlined from "../../Icons/CopyOutlined";
import Open from "../../Icons/Open";
import SettingForm from "../../Pages/Setting/SettingForm";
import { getGDriveTaskStats, getTaskStatusText } from "../../Pages/Tasks/TaskProps";
import BackupEventLog from "./BackupEventLog";
import BackupPhaseTimeline from "./BackupPhaseTimeline";
import {
  formatWallDuration,
  getBackupPhaseSpans,
  getRestorePhaseSpans,
  getTriggerText,
  historyPollInterval,
  isTaskActive,
  parseTaskState,
} from "./backupHistoryUtils";
import RestoreDialog from "./RestoreDialog";

export interface BackupTaskDialogProps {
  open: boolean;
  onClose: () => void;
  taskID?: number;
}

const BackupTaskDialog = ({ open, onClose, taskID }: BackupTaskDialogProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [task, setTask] = useState<Task>({ edges: {}, id: 0 });
  const [loading, setLoading] = useState(true);
  // 请求世代：每次 (open, taskID) 变化时递增，旧世代请求的 then/catch/finally 一律丢弃
  const generation = useRef(0);
  // 同一世代内按发起顺序编号，较早发起的轮询不能覆盖较新的结果
  const requestSeq = useRef(0);
  const appliedSeq = useRef(0);

  // 发起一次详情请求，返回的 isCurrent 判断该请求是否仍属于当前世代
  const requestDetail = (id: number) => {
    const gen = generation.current;
    const seq = ++requestSeq.current;
    const isCurrent = () => gen === generation.current;
    const request = dispatch(getTaskDetail(id)).then((res) => {
      if (isCurrent() && seq > appliedSeq.current) {
        appliedSeq.current = seq;
        setTask(res);
      }
    });
    return { request, isCurrent };
  };

  useEffect(() => {
    generation.current++;
    if (!taskID || !open) {
      return;
    }
    setLoading(true);
    const { request, isCurrent } = requestDetail(taskID);
    request
      .catch(() => {
        if (isCurrent()) {
          onClose();
        }
      })
      .finally(() => {
        if (isCurrent()) {
          setLoading(false);
        }
      });
  }, [open, taskID]);

  // 详情属于当前任务且已加载完成；切换任务后在新详情返回前不展示旧任务的内容
  const ready = !loading && task.id === taskID;
  // 任务仍在执行时定时静默刷新详情，任务结束后停止
  const active = isTaskActive(task.status);
  useEffect(() => {
    if (!open || !taskID || !ready || !active) {
      return;
    }
    const timer = setInterval(() => {
      requestDetail(taskID).request.catch(() => {});
    }, historyPollInterval);
    return () => clearInterval(timer);
  }, [open, taskID, ready, active, dispatch]);

  return (
    <DraggableDialog
      title={t("backup.history.dialogTitle", { id: taskID ?? "" })}
      dialogProps={{
        fullWidth: true,
        maxWidth: "lg",
        open: open,
        onClose: onClose,
      }}
    >
      <DialogContent>
        <AutoHeight>
          <SwitchTransition>
            <CSSTransition
              addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
              classNames="fade"
              key={`${ready}`}
            >
              <Box>
                {!ready && (
                  <Box
                    sx={{
                      py: 15,
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <FacebookCircularProgress />
                  </Box>
                )}
                {ready && <BackupTaskDetail task={task} />}
              </Box>
            </CSSTransition>
          </SwitchTransition>
        </AutoHeight>
      </DialogContent>
    </DraggableDialog>
  );
};

const BackupTaskDetail = ({ task }: { task: Task }) => {
  const { t } = useTranslation("dashboard");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [restoreSnapshot, setRestoreSnapshot] = useState<BackupSnapshot | undefined>(undefined);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const isBackup = task.type == TaskType.gdrive_backup;
  const backupState = useMemo(
    () => (isBackup ? parseTaskState<GDriveBackupTaskState>(task.private_state) : undefined),
    [isBackup, task.private_state],
  );
  const restoreState = useMemo(
    () => (isBackup ? undefined : parseTaskState<GDriveRestoreTaskState>(task.private_state)),
    [isBackup, task.private_state],
  );
  // 两种任务共有的事件日志与失败文件字段
  const state: GDriveTaskEventLog & { errors?: string[] } = backupState ?? restoreState ?? {};
  const events = state.events ?? [];
  const spans = useMemo(
    () => (backupState ? getBackupPhaseSpans(backupState) : restoreState ? getRestorePhaseSpans(restoreState) : []),
    [backupState, restoreState],
  );
  const errors = state.errors ?? [];
  const failedTotal = (backupState ? backupState.stats?.failed : restoreState?.failed) ?? 0;
  const snapshotName = backupState?.stats?.snapshot;
  // 旧任务或尚未开始时 started_at 为零值时间
  const startedAt =
    backupState?.started_at && dayjs(backupState.started_at).year() > 1 ? backupState.started_at : undefined;
  const remoteNodes = Object.entries(backupState?.remote ?? {});

  // 快照列表才有快照 ID 与可读性，按快照名在当前快照中查找
  const openSnapshot = () => {
    if (!snapshotName) {
      return;
    }
    setSnapshotLoading(true);
    dispatch(getBackupSnapshots())
      .then((res) => {
        const snapshot = (res ?? []).find((s) => s.name === snapshotName);
        if (!snapshot) {
          enqueueSnackbar(t("backup.history.snapshotNotFound"), { variant: "warning", action: DefaultCloseAction });
        } else if (!snapshot.readable) {
          enqueueSnackbar(t("backup.keyMismatchDes"), { variant: "warning", action: DefaultCloseAction });
        } else {
          setRestoreSnapshot(snapshot);
          setRestoreOpen(true);
        }
      })
      .catch(() => {})
      .finally(() => setSnapshotLoading(false));
  };

  return (
    <>
      {restoreSnapshot && (
        <RestoreDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} snapshot={restoreSnapshot} />
      )}
      <Grid container spacing={isMobile ? 2 : 3} alignItems={"stretch"}>
        <SettingForm title={t("task.type")} noContainer lgWidth={3}>
          <Typography variant={"body2"} color={"textSecondary"}>
            {t(`task.${task.type}`)}
          </Typography>
        </SettingForm>

        <SettingForm title={t("task.status")} noContainer lgWidth={3}>
          <Typography variant={"body2"} color={"textSecondary"}>
            {getTaskStatusText(task.status ?? TaskStatus.queued, t)}
          </Typography>
        </SettingForm>

        {isBackup && (
          <SettingForm title={t("backup.history.trigger")} noContainer lgWidth={3}>
            <Typography variant={"body2"} color={"textSecondary"}>
              {getTriggerText(backupState?.trigger ?? task.summary?.props?.trigger, t)}
            </Typography>
          </SettingForm>
        )}

        <SettingForm title={t("backup.history.duration")} noContainer lgWidth={3}>
          <Typography variant={"body2"} color={"textSecondary"}>
            {formatWallDuration(task)}
          </Typography>
        </SettingForm>

        <SettingForm title={t("application:setting.executeDuration")} noContainer lgWidth={3}>
          <Typography variant={"body2"} color={"textSecondary"}>
            {task.public_state?.executed_duration
              ? formatDuration(dayjs.duration(task.public_state.executed_duration / 1e6)) // 纳秒转毫秒
              : "-"}
          </Typography>
        </SettingForm>

        <SettingForm title={t("user.createdAt")} noContainer lgWidth={3}>
          <Typography variant={"body2"} color={"textSecondary"}>
            <TimeBadge datetime={task.created_at ?? ""} variant="inherit" timeAgoThreshold={0} />
          </Typography>
        </SettingForm>

        {isBackup && (
          <SettingForm title={t("backup.history.startedAt")} noContainer lgWidth={3}>
            <Typography variant={"body2"} color={"textSecondary"}>
              {startedAt ? <TimeBadge datetime={startedAt} variant="inherit" timeAgoThreshold={0} /> : "-"}
            </Typography>
          </SettingForm>
        )}

        <SettingForm title={t("task.updatedAt")} noContainer lgWidth={3}>
          <Typography variant={"body2"} color={"textSecondary"}>
            <TimeBadge datetime={task.updated_at ?? ""} variant="inherit" timeAgoThreshold={0} />
          </Typography>
        </SettingForm>

        {isBackup && (
          <SettingForm title={t("backup.encryption")} noContainer lgWidth={3}>
            {!backupState?.key_id ? (
              <Typography variant={"body2"} color={"textSecondary"}>
                -
              </Typography>
            ) : backupState.key_id === BackupPlainKeyID ? (
              <SquareChip size="small" label={t("backup.notEncrypted")} />
            ) : (
              <Tooltip title={backupState.key_id}>
                <SquareChip size="small" color="primary" variant="outlined" label={t("backup.encrypted")} />
              </Tooltip>
            )}
          </SettingForm>
        )}

        {isBackup && (
          <SettingForm title={t("backup.history.policyIds")} noContainer lgWidth={3}>
            <Typography variant={"body2"} color={"textSecondary"}>
              {backupState?.policies?.length ? backupState.policies.join(", ") : "-"}
            </Typography>
          </SettingForm>
        )}

        {restoreState && (
          <>
            <SettingForm title={t("backup.restoreTarget")} noContainer lgWidth={3}>
              <Typography variant={"body2"} color={"textSecondary"}>
                {restoreState.target_uid
                  ? t("backup.uid", { uid: restoreState.target_uid })
                  : t("backup.restoreToOwner")}
              </Typography>
            </SettingForm>
            <SettingForm title={t("backup.restoreLocation")} noContainer lgWidth={3}>
              <Typography variant={"body2"} color={"textSecondary"} sx={{ overflowWrap: "anywhere" }}>
                {restoreState.keep_path ? t("backup.restoreToOriginalPath") : restoreState.target_dir || "-"}
              </Typography>
            </SettingForm>
            <SettingForm
              title={t("backup.history.restoreItems", { count: restoreState.items?.length ?? 0 })}
              noContainer
              lgWidth={6}
            >
              <Box
                component="ul"
                sx={{
                  paddingInlineStart: "20px",
                  m: 0,
                  maxHeight: 150,
                  overflowY: "auto",
                  overflowWrap: "anywhere",
                  typography: "body2",
                  color: "text.secondary",
                }}
              >
                {(restoreState.items ?? []).map((item, index) => (
                  <li key={index}>
                    {t("backup.uid", { uid: item.uid })} {item.path}
                  </li>
                ))}
              </Box>
            </SettingForm>
          </>
        )}

        <SettingForm title={t("backup.history.stats")} noContainer lgWidth={12}>
          <Grid container spacing={1}>
            {getGDriveTaskStats(task.type, task.summary, t).map((stat) => (
              <Grid key={stat.label} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 1.5,
                    py: 1,
                    height: "100%",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                    {stat.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {snapshotName && (
            <Box sx={{ mt: 1 }}>
              <SecondaryLoadingButton
                variant="contained"
                startIcon={<Open />}
                loading={snapshotLoading}
                onClick={openSnapshot}
              >
                <span>{t("backup.browseAndRestore")}</span>
              </SecondaryLoadingButton>
            </Box>
          )}
        </SettingForm>

        {task.public_state?.error && (
          <SettingForm title={t("task.errorMsg")} noContainer lgWidth={12}>
            <Alert severity="error" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
              {task.public_state.error}
            </Alert>
          </SettingForm>
        )}

        <SettingForm title={t("backup.history.timeline")} noContainer lgWidth={12}>
          <BackupPhaseTimeline spans={spans} active={isTaskActive(task.status)} />
        </SettingForm>

        {isBackup && remoteNodes.length > 0 && (
          <SettingForm title={t("backup.history.remoteNodes")} noContainer lgWidth={12}>
            <RemoteNodeTable nodes={remoteNodes} events={events} />
          </SettingForm>
        )}

        <SettingForm title={t("backup.history.events")} noContainer lgWidth={12}>
          <BackupEventLog events={events} dropped={state.events_dropped} />
        </SettingForm>

        {errors.length > 0 && (
          <SettingForm
            title={
              <>
                {t("backup.fileErrors", { count: failedTotal || errors.length })}
                <Tooltip title={t("backup.history.copyAll")}>
                  <IconButton size="small" sx={{ ml: 1 }} onClick={() => copyToClipboard(errors.join("\n"))}>
                    <CopyOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            }
            noContainer
            lgWidth={12}
          >
            {failedTotal > errors.length && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("backup.history.failuresTruncated", { count: errors.length, total: failedTotal })}
              </Typography>
            )}
            <Box
              component="ul"
              sx={{
                paddingInlineStart: "20px",
                m: 0,
                maxHeight: 300,
                overflowY: "auto",
                overflowWrap: "anywhere",
                typography: "body2",
              }}
            >
              {errors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </Box>
          </SettingForm>
        )}

        {task.public_state?.error_history && task.public_state.error_history.length > 0 && (
          <SettingForm title={t("application:setting.retryErrorHistory")} noContainer lgWidth={12}>
            <TableContainer component={StyledTableContainerPaper}>
              <Table sx={{ width: "100%" }} size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>{t("common:error")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {task.public_state.error_history.map((error, index) => (
                    <TableRow key={index} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell component="th" scope="row">
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ overflowWrap: "anywhere" }}>{error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SettingForm>
        )}
      </Grid>
    </>
  );
};

interface RemoteNodeTableProps {
  nodes: [string, GDriveRemoteNode][];
  events: GDriveTaskEvent[];
}

// 从机节点进度：进度按队列文件的字节偏移（done / written）计算
const RemoteNodeTable = ({ nodes, events }: RemoteNodeTableProps) => {
  const { t } = useTranslation("dashboard");

  // 状态中只有节点 ID，节点名取自最近一条带该节点的事件
  const nodeNames = useMemo(() => {
    const res: Record<string, string> = {};
    events.forEach((e) => {
      if (e.p?.node_id !== undefined && typeof e.p.node_name === "string" && e.p.node_name) {
        res[String(e.p.node_id)] = e.p.node_name;
      }
    });
    return res;
  }, [events]);

  return (
    <TableContainer component={StyledTableContainerPaper}>
      <Table size="small" sx={{ width: "100%" }}>
        <TableHead>
          <TableRow>
            <NoWrapTableCell>{t("backup.history.node")}</NoWrapTableCell>
            <NoWrapTableCell>{t("backup.history.nodeQueued")}</NoWrapTableCell>
            <NoWrapTableCell width={240}>{t("backup.history.nodeProgress")}</NoWrapTableCell>
            <NoWrapTableCell>{t("backup.history.nodeAttempts")}</NoWrapTableCell>
            <NoWrapTableCell>{t("backup.history.nodeInflight")}</NoWrapTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {nodes.map(([id, node]) => {
            const percent = node.written > 0 ? Math.min(100, (node.done / node.written) * 100) : 100;
            return (
              <TableRow key={id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <NoWrapTableCell>
                  <Link component={RouterLink} to={`/admin/node/${id}`} underline="hover">
                    {nodeNames[id] ?? `#${id}`}
                  </Link>
                </NoWrapTableCell>
                <NoWrapTableCell>{node.queued ?? "-"}</NoWrapTableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LinearProgress variant="determinate" value={percent} sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {`${Math.floor(percent)}%`}
                    </Typography>
                  </Stack>
                </TableCell>
                <NoWrapTableCell>{node.attempts ?? 0}</NoWrapTableCell>
                <NoWrapTableCell>
                  {node.inflight
                    ? t("backup.history.inflightBatch", {
                        id: node.inflight.slave_task_id,
                        errors: node.inflight.poll_errors ?? 0,
                      })
                    : "-"}
                </NoWrapTableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BackupTaskDialog;
