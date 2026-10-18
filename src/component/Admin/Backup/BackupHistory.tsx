import {
  Box,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTaskList } from "../../../api/api";
import type { AdminListService, Task } from "../../../api/dashboard";
import { TaskType } from "../../../api/workflow";
import { useAppDispatch } from "../../../redux/hooks";
import { sizeToString } from "../../../util";
import {
  NoWrapTableCell,
  NoWrapTypography,
  SecondaryButton,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import ArrowSync from "../../Icons/ArrowSync";
import TaskSummaryStatus from "../../Pages/Tasks/TaskSummaryStatus";
import TablePagination from "../Common/TablePagination";
import { PageQuery, PageSizeQuery } from "../StoragePolicy/StoragePolicySetting";
import BackupTaskDialog from "./BackupTaskDialog";
import { formatWallDuration, getTriggerText } from "./backupHistoryUtils";

export const HistoryKindQuery = "kind";

export enum BackupHistoryKind {
  backup = "backup",
  restore = "restore",
}

const backupColumns = 10;
const restoreColumns = 6;

// 备份页“运行记录”页签：按任务类型列出 Google Drive 备份/恢复任务
const BackupHistory = () => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [count, setCount] = useState(0);
  const [kind, setKind] = useQueryState(HistoryKindQuery, { defaultValue: BackupHistoryKind.backup });
  const [page, setPage] = useQueryState(PageQuery, { defaultValue: "1" });
  const [pageSize, setPageSize] = useQueryState(PageSizeQuery, { defaultValue: "10" });
  const [openTask, setOpenTask] = useState<number | undefined>(undefined);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const isBackup = kind !== BackupHistoryKind.restore;
  const pageInt = parseInt(page) || 1;
  const pageSizeInt = parseInt(pageSize) || 10;
  const columns = isBackup ? backupColumns : restoreColumns;

  // 列表请求序号：筛选或分页变化后，只接受最新一次查询的结果和 loading 收尾
  const latestRequest = useRef(0);

  const fetchTasks = () => {
    const request = ++latestRequest.current;
    setLoading(true);
    const params: AdminListService = {
      page: pageInt,
      page_size: pageSizeInt,
      order_by: "id",
      order_direction: "desc",
      conditions: {
        task_type: isBackup ? TaskType.gdrive_backup : TaskType.gdrive_restore,
      },
    };
    dispatch(getTaskList(params))
      .then((res) => {
        if (request !== latestRequest.current) {
          return;
        }
        setTasks(res.tasks);
        setPageSize(res.pagination.page_size.toString());
        setCount(res.pagination.total_items ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (request === latestRequest.current) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchTasks();
  }, [page, pageSize, kind]);

  const onKindChange = (_e: React.MouseEvent<HTMLElement>, value: BackupHistoryKind | null) => {
    if (!value || value === kind) {
      return;
    }
    setTasks([]);
    setCount(0);
    setPage("1");
    setKind(value);
  };

  const openDetails = (id: number) => {
    setOpenTask(id);
    setTaskDialogOpen(true);
  };

  return (
    <Box>
      <BackupTaskDialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} taskID={openTask} />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <ToggleButtonGroup
          size="small"
          exclusive
          color="primary"
          value={isBackup ? BackupHistoryKind.backup : BackupHistoryKind.restore}
          onChange={onKindChange}
        >
          <ToggleButton value={BackupHistoryKind.backup}>{t("backup.history.backupTasks")}</ToggleButton>
          <ToggleButton value={BackupHistoryKind.restore}>{t("backup.history.restoreTasks")}</ToggleButton>
        </ToggleButtonGroup>
        <SecondaryButton onClick={fetchTasks} disabled={loading} variant={"contained"} startIcon={<ArrowSync />}>
          {t("backup.refresh")}
        </SecondaryButton>
      </Stack>
      <TableContainer component={StyledTableContainerPaper}>
        <Table size="small" stickyHeader sx={{ width: "100%" }}>
          <TableHead>
            {isBackup ? (
              <TableRow>
                <NoWrapTableCell width={70}>{t("group.#")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.trigger")}</NoWrapTableCell>
                <NoWrapTableCell>{t("task.status")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.startedAt")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.duration")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.fileCount")}</NoWrapTableCell>
                <NoWrapTableCell>{t("application:setting.gdriveUploaded")}</NoWrapTableCell>
                <NoWrapTableCell>{t("application:setting.gdriveReused")}</NoWrapTableCell>
                <NoWrapTableCell>{t("application:setting.gdriveFailed")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.snapshotName")}</NoWrapTableCell>
              </TableRow>
            ) : (
              <TableRow>
                <NoWrapTableCell width={70}>{t("group.#")}</NoWrapTableCell>
                <NoWrapTableCell>{t("task.status")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.startedAt")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.duration")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.snapshotName")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.restoreCounts")}</NoWrapTableCell>
              </TableRow>
            )}
          </TableHead>
          <TableBody>
            {loading &&
              Array.from(Array(Math.min(tasks.length || 10, 10))).map((_, index) => (
                <TableRow key={`loading-${index}`} sx={{ height: "44px" }}>
                  {Array.from(Array(columns)).map((_, cell) => (
                    <NoWrapTableCell key={cell}>
                      <Skeleton variant="text" width={cell == 0 ? 30 : 60} />
                    </NoWrapTableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && tasks.length == 0 && (
              <TableRow>
                <TableCell colSpan={columns} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {t("backup.history.noRecords")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              tasks.map((task) => {
                const props = task.summary?.props;
                return (
                  <TableRow hover key={task.id} sx={{ cursor: "pointer" }} onClick={() => openDetails(task.id)}>
                    <NoWrapTableCell>
                      {/* 整行点击之外的键盘可达入口 */}
                      <Link
                        component="button"
                        variant="inherit"
                        aria-label={t("backup.history.viewDetails", { id: task.id })}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(task.id);
                        }}
                      >
                        {task.id}
                      </Link>
                    </NoWrapTableCell>
                    {isBackup && <NoWrapTableCell>{getTriggerText(props?.trigger, t)}</NoWrapTableCell>}
                    <NoWrapTableCell>
                      <TaskSummaryStatus
                        simplified
                        type={task.type ?? ""}
                        status={task.status ?? ""}
                        summary={task.summary}
                        error={task.public_state?.error}
                      />
                    </NoWrapTableCell>
                    <NoWrapTableCell>
                      <TimeBadge datetime={task.created_at ?? ""} variant="inherit" timeAgoThreshold={0} />
                    </NoWrapTableCell>
                    <NoWrapTableCell>{formatWallDuration(task)}</NoWrapTableCell>
                    {isBackup && (
                      <>
                        <NoWrapTableCell>{props?.files ?? 0}</NoWrapTableCell>
                        <NoWrapTableCell>{`${props?.uploaded ?? 0} (${sizeToString(
                          props?.uploaded_size ?? 0,
                        )})`}</NoWrapTableCell>
                        <NoWrapTableCell>{props?.reused ?? 0}</NoWrapTableCell>
                        <NoWrapTableCell>{props?.failed ?? 0}</NoWrapTableCell>
                      </>
                    )}
                    <NoWrapTableCell>
                      <NoWrapTypography variant="inherit">{props?.snapshot || "-"}</NoWrapTypography>
                    </NoWrapTableCell>
                    {!isBackup && (
                      <NoWrapTableCell>{`${props?.restored ?? 0} / ${props?.skipped ?? 0} / ${
                        props?.failed ?? 0
                      }`}</NoWrapTableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      {count > 0 && (
        <Box sx={{ mt: 1 }}>
          <TablePagination
            page={pageInt}
            totalItems={count}
            rowsPerPage={pageSizeInt}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onRowsPerPageChange={(value) => setPageSize(value.toString())}
            onChange={(_, value) => setPage(value.toString())}
          />
        </Box>
      )}
    </Box>
  );
};

export default BackupHistory;
