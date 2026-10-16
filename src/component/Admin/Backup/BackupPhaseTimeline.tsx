import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { useTranslation } from "react-i18next";
import { formatDuration } from "../../../util/datetime";
import { NoWrapTableCell, SquareChip, StyledTableContainerPaper } from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import type { PhaseSpan } from "./backupHistoryUtils";

dayjs.extend(duration);

export interface BackupPhaseTimelineProps {
  spans: PhaseSpan[];
  // 任务仍在执行：最后一个没有结束时间的阶段视为进行中
  active: boolean;
}

const BackupPhaseTimeline = ({ spans, active }: BackupPhaseTimelineProps) => {
  const { t } = useTranslation("dashboard");

  if (spans.length == 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t("backup.history.noTimeline")}
      </Typography>
    );
  }

  return (
    <TableContainer component={StyledTableContainerPaper}>
      <Table size="small" sx={{ width: "100%" }}>
        <TableHead>
          <TableRow>
            <NoWrapTableCell>{t("backup.history.phase")}</NoWrapTableCell>
            <NoWrapTableCell>{t("backup.history.phaseStatus")}</NoWrapTableCell>
            <NoWrapTableCell>{t("backup.history.startedAt")}</NoWrapTableCell>
            <NoWrapTableCell>{t("backup.history.duration")}</NoWrapTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {spans.map((span) => {
            const ongoing = !span.end && active;
            // 进行中的阶段按当前时间计算已持续时长
            const end = span.end ?? (ongoing ? dayjs().toISOString() : undefined);
            return (
              <TableRow key={span.labelKey} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <NoWrapTableCell>{t(span.labelKey)}</NoWrapTableCell>
                <NoWrapTableCell>
                  {span.failed ? (
                    <SquareChip size="small" color="error" label={t("backup.history.phaseFailed")} />
                  ) : ongoing ? (
                    <SquareChip size="small" color="primary" label={t("backup.history.phaseRunning")} />
                  ) : span.end ? (
                    <SquareChip size="small" color="success" variant="outlined" label={t("backup.history.phaseDone")} />
                  ) : (
                    <SquareChip size="small" label={t("backup.history.phaseInterrupted")} />
                  )}
                </NoWrapTableCell>
                <NoWrapTableCell>
                  <TimeBadge variant="inherit" datetime={span.start} timeAgoThreshold={0} />
                </NoWrapTableCell>
                <TableCell>
                  {end ? formatDuration(dayjs.duration(Math.max(0, dayjs(end).diff(dayjs(span.start))))) : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BackupPhaseTimeline;
