import {
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { GDriveTaskEvent } from "../../../api/dashboard";
import { NoWrapTableCell, StyledTableContainerPaper } from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import DismissCircleFilled from "../../Icons/DismissCircleFilled";
import Info from "../../Icons/Info";
import Warning from "../../Icons/Warning";
import { formatEventMessage } from "./backupHistoryUtils";

export interface BackupEventLogProps {
  events: GDriveTaskEvent[];
  // 超出保留上限后被丢弃的最旧事件数
  dropped?: number;
}

const BackupEventLog = ({ events, dropped }: BackupEventLogProps) => {
  const { t, i18n } = useTranslation("dashboard");

  const levelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <DismissCircleFilled fontSize="small" color="error" />;
      case "warning":
        return <Warning fontSize="small" color="warning" />;
      default:
        return <Info fontSize="small" color="info" />;
    }
  };

  return (
    <Stack spacing={1}>
      {!!dropped && (
        <Alert severity="info" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
          {t("backup.history.eventsDropped", { count: dropped })}
        </Alert>
      )}
      {events.length == 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("backup.history.noEvents")}
        </Typography>
      ) : (
        <TableContainer component={StyledTableContainerPaper} sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <NoWrapTableCell width={180}>{t("backup.history.eventTime")}</NoWrapTableCell>
                <NoWrapTableCell width={60}>{t("backup.history.eventLevel")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.history.eventMessage")}</NoWrapTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event, index) => (
                <TableRow key={index} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                  <NoWrapTableCell>
                    <TimeBadge variant="inherit" datetime={event.t} timeAgoThreshold={0} />
                  </NoWrapTableCell>
                  <NoWrapTableCell>
                    <Tooltip title={t(`backup.history.levels.${event.l}`, { defaultValue: event.l })}>
                      {levelIcon(event.l)}
                    </Tooltip>
                  </NoWrapTableCell>
                  <TableCell sx={{ overflowWrap: "anywhere" }}>{formatEventMessage(event, t, i18n)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
};

export default BackupEventLog;
