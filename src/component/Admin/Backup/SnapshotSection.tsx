import {
  Button,
  Grid2,
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
import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBackupSnapshots } from "../../../api/api";
import { BackupPlainKeyID } from "../../../api/dashboard";
import type { BackupSnapshot } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import { sizeToString } from "../../../util";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { NoWrapTableCell, SecondaryButton, SquareChip, StyledTableContainerPaper } from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import Archive from "../../Icons/Archive";
import ArrowClockwise from "../../Icons/ArrowClockwise";
import ClockFilled from "../../Icons/ClockFilled";
import DocumentCopyFilled from "../../Icons/DocumentCopyFilled";
import HardDrive from "../../Icons/HardDrive";
import LockClosedOutlined from "../../Icons/LockClosedOutlined";
import Timer from "../../Icons/Timer";
import { SettingContext } from "../Settings/SettingWrapper";
import { BackupCard, BackupCardHeader, BackupPageTab, StatTile, ToneIcon } from "./BackupUi";
import RestoreDialog from "./RestoreDialog";

export interface SnapshotSectionProps {
  authorized: boolean;
  onNavigate: (tab: BackupPageTab) => void;
}

const SnapshotSection = ({ authorized, onNavigate }: SnapshotSectionProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { values } = useContext(SettingContext);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupSnapshot | undefined>(undefined);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    dispatch(getBackupSnapshots())
      .then((res) => setSnapshots(res ?? []))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setLoaded(true);
      });
  }, [dispatch]);

  useEffect(() => {
    if (authorized) {
      refresh();
    }
  }, [authorized, refresh]);

  const retentionDays = values.gdrive_backup_retention_days || "7";

  if (!authorized) {
    return (
      <BackupCard>
        <Stack spacing={2} alignItems="center" sx={{ py: 6, textAlign: "center" }}>
          <ToneIcon tone="neutral" size={56}>
            <Archive />
          </ToneIcon>
          <Typography variant="subtitle1" fontWeight={600}>
            {t("backup.snapshots")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {t("backup.snapshotsNeedAuth")}
          </Typography>
          <Button variant="contained" disableElevation onClick={() => onNavigate(BackupPageTab.Account)}>
            {t("backup.goConnect")}
          </Button>
        </Stack>
      </BackupCard>
    );
  }

  // 后端按时间倒序返回，第一份即最新快照
  const latest = snapshots[0];
  const tiles = [
    {
      icon: <Archive />,
      label: t("backup.snapshotCount"),
      value: loaded ? snapshots.length.toLocaleString() : "-",
    },
    {
      icon: <ClockFilled />,
      label: t("backup.latestSnapshot"),
      value: latest ? <TimeBadge variant="inherit" datetime={latest.created_at} /> : "-",
    },
    {
      icon: <DocumentCopyFilled />,
      label: t("backup.latestSnapshotFiles"),
      value: latest ? latest.files.toLocaleString() : "-",
      hint: latest ? sizeToString(latest.size) : undefined,
    },
    {
      icon: <Timer />,
      label: t("backup.retentionDays"),
      value: `${retentionDays} ${t("backup.days")}`,
    },
  ];

  return (
    <Stack spacing={2}>
      <Grid2 container spacing={1.5}>
        {tiles.map((tile) => (
          <Grid2 key={tile.label} size={{ xs: 6, md: 3 }}>
            <StatTile {...tile} />
          </Grid2>
        ))}
      </Grid2>

      <BackupCard>
        <BackupCardHeader
          icon={<Archive />}
          tone="primary"
          title={t("backup.snapshots")}
          subtitle={t("backup.snapshotsDes", { days: retentionDays })}
          action={
            <SecondaryButton variant="contained" startIcon={<ArrowClockwise />} disabled={loading} onClick={refresh}>
              {t("backup.refresh")}
            </SecondaryButton>
          }
        />
        <TableContainer component={StyledTableContainerPaper}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <NoWrapTableCell>{t("backup.snapshotTime")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.snapshotName")}</NoWrapTableCell>
                <NoWrapTableCell align="right">{t("backup.fileCount")}</NoWrapTableCell>
                <NoWrapTableCell align="right">{t("backup.size")}</NoWrapTableCell>
                <NoWrapTableCell>{t("backup.encryption")}</NoWrapTableCell>
                <NoWrapTableCell align="right">{t("backup.actions")}</NoWrapTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <FacebookCircularProgress size={24} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && snapshots.length == 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("backup.noSnapshots")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                snapshots.map((snapshot, index) => (
                  <TableRow hover key={snapshot.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <NoWrapTableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TimeBadge variant="body2" datetime={snapshot.created_at} timeAgoThreshold={0} />
                        {index == 0 && <SquareChip size="small" color="primary" label={t("backup.latestChip")} />}
                      </Stack>
                    </NoWrapTableCell>
                    <NoWrapTableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {snapshot.name}
                      </Typography>
                    </NoWrapTableCell>
                    <NoWrapTableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {snapshot.files.toLocaleString()}
                    </NoWrapTableCell>
                    <NoWrapTableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                        <HardDrive sx={{ fontSize: 14, color: "text.secondary" }} />
                        <span>{sizeToString(snapshot.size)}</span>
                      </Stack>
                    </NoWrapTableCell>
                    <NoWrapTableCell>
                      {snapshot.key_id === BackupPlainKeyID ? (
                        <SquareChip size="small" variant="outlined" label={t("backup.notEncrypted")} />
                      ) : (
                        <Tooltip title={snapshot.key_id}>
                          <SquareChip
                            size="small"
                            color="success"
                            variant="outlined"
                            icon={<LockClosedOutlined />}
                            label={t("backup.encrypted")}
                          />
                        </Tooltip>
                      )}
                      {!snapshot.readable && (
                        <Tooltip title={t("backup.keyMismatchDes")}>
                          <SquareChip size="small" color="warning" sx={{ ml: 1 }} label={t("backup.keyMismatch")} />
                        </Tooltip>
                      )}
                    </NoWrapTableCell>
                    <NoWrapTableCell align="right">
                      <Tooltip title={snapshot.readable ? "" : t("backup.keyMismatchDes")}>
                        <span>
                          <Button
                            size="small"
                            disabled={!snapshot.readable}
                            onClick={() => {
                              setRestoreTarget(snapshot);
                              setRestoreOpen(true);
                            }}
                          >
                            {t("backup.browseAndRestore")}
                          </Button>
                        </span>
                      </Tooltip>
                    </NoWrapTableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </BackupCard>
      {restoreTarget && (
        <RestoreDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} snapshot={restoreTarget} />
      )}
    </Stack>
  );
};

export default SnapshotSection;
