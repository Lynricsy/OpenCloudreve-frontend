import {
  Box,
  Button,
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
import { getBackupSnapshots } from "../../../../api/api";
import { BackupPlainKeyID } from "../../../../api/dashboard";
import type { BackupSnapshot } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { sizeToString } from "../../../../util";
import FacebookCircularProgress from "../../../Common/CircularProgress";
import {
  NoWrapTableCell,
  SecondaryButton,
  SquareChip,
  StyledTableContainerPaper,
} from "../../../Common/StyledComponents";
import TimeBadge from "../../../Common/TimeBadge";
import ArrowClockwise from "../../../Icons/ArrowClockwise";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../Settings";
import { SettingContext } from "../SettingWrapper";
import RestoreDialog from "./RestoreDialog";

export interface SnapshotSectionProps {
  authorized: boolean;
}

const SnapshotSection = ({ authorized }: SnapshotSectionProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { values } = useContext(SettingContext);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupSnapshot | undefined>(undefined);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    dispatch(getBackupSnapshots())
      .then((res) => setSnapshots(res ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    if (authorized) {
      refresh();
    }
  }, [authorized, refresh]);

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("backup.snapshots")}
      </Typography>
      <SettingSectionContent>
        <SettingForm lgWidth={12}>
          <NoMarginHelperText sx={{ mt: 0 }}>
            {t("backup.snapshotsDes", { days: values.gdrive_backup_retention_days || "7" })}
          </NoMarginHelperText>
        </SettingForm>
        {!authorized && (
          <SettingForm lgWidth={12}>
            <Typography variant="body2" color="text.secondary">
              {t("backup.snapshotsNeedAuth")}
            </Typography>
          </SettingForm>
        )}
        {authorized && (
          <SettingForm lgWidth={12}>
            <Box sx={{ mb: 1 }}>
              <SecondaryButton variant="contained" startIcon={<ArrowClockwise />} disabled={loading} onClick={refresh}>
                {t("backup.refresh")}
              </SecondaryButton>
            </Box>
            <TableContainer component={StyledTableContainerPaper}>
              <Table size="small" sx={{ width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <NoWrapTableCell>{t("backup.snapshotTime")}</NoWrapTableCell>
                    <NoWrapTableCell>{t("backup.snapshotName")}</NoWrapTableCell>
                    <NoWrapTableCell>{t("backup.fileCount")}</NoWrapTableCell>
                    <NoWrapTableCell>{t("backup.size")}</NoWrapTableCell>
                    <NoWrapTableCell>{t("backup.encryption")}</NoWrapTableCell>
                    <NoWrapTableCell align="right">{t("backup.actions")}</NoWrapTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <FacebookCircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && snapshots.length == 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {t("backup.noSnapshots")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    snapshots.map((snapshot) => (
                      <TableRow hover key={snapshot.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        <NoWrapTableCell>
                          <TimeBadge variant="body2" datetime={snapshot.created_at} timeAgoThreshold={0} />
                        </NoWrapTableCell>
                        <NoWrapTableCell>
                          <Typography variant="body2" color="text.secondary">
                            {snapshot.name}
                          </Typography>
                        </NoWrapTableCell>
                        <NoWrapTableCell>{snapshot.files}</NoWrapTableCell>
                        <NoWrapTableCell>{sizeToString(snapshot.size)}</NoWrapTableCell>
                        <NoWrapTableCell>
                          {snapshot.key_id === BackupPlainKeyID ? (
                            <SquareChip size="small" label={t("backup.notEncrypted")} />
                          ) : (
                            <Tooltip title={snapshot.key_id}>
                              <SquareChip
                                size="small"
                                color="primary"
                                variant="outlined"
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
          </SettingForm>
        )}
      </SettingSectionContent>
      {restoreTarget && (
        <RestoreDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} snapshot={restoreTarget} />
      )}
    </SettingSection>
  );
};

export default SnapshotSection;
