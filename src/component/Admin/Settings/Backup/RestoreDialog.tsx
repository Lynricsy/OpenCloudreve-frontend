import {
  Alert,
  Box,
  Breadcrumbs,
  DialogContent,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { browseBackupSnapshot, restoreBackup } from "../../../../api/api";
import type {
  BackupRestoreItem,
  BackupSnapshot,
  BackupSnapshotEntry,
  BackupSnapshotUser,
} from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { sizeToString } from "../../../../util";
import FacebookCircularProgress from "../../../Common/CircularProgress";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar";
import {
  DenseFilledTextField,
  NoWrapTableCell,
  StyledCheckbox,
  StyledTableContainerPaper,
} from "../../../Common/StyledComponents";
import TimeBadge from "../../../Common/TimeBadge";
import DraggableDialog from "../../../Dialogs/DraggableDialog";
import ChevronRight from "../../../Icons/ChevronRight";
import Document from "../../../Icons/Document";
import Folder from "../../../Icons/Folder";
import People from "../../../Icons/People";
import Person from "../../../Icons/Person";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../Settings";

export interface RestoreDialogProps {
  open: boolean;
  onClose: () => void;
  snapshot: BackupSnapshot;
}

// 当前浏览位置；为空时位于用户列表
interface BrowseLocation {
  uid: number;
  owner: string;
  path: string;
}

enum RestoreTarget {
  owner = "owner",
  user = "user",
}

// 判断 path 是否为 parent 本身或位于 parent 之下
const isWithin = (parent: string, path: string) => parent === "/" || path === parent || path.startsWith(parent + "/");

const RestoreDialog = ({ open, onClose, snapshot }: RestoreDialogProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formRef = useRef<HTMLFormElement>(null);

  const [location, setLocation] = useState<BrowseLocation | null>(null);
  const [users, setUsers] = useState<BackupSnapshotUser[]>([]);
  const [entries, setEntries] = useState<BackupSnapshotEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, BackupRestoreItem>>({});
  const [target, setTarget] = useState<RestoreTarget>(RestoreTarget.owner);
  const [targetUid, setTargetUid] = useState("");
  const [targetDir, setTargetDir] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 打开对话框或切换快照时重置状态
  useEffect(() => {
    if (!open) {
      return;
    }
    setLocation(null);
    setSelected({});
    setTarget(RestoreTarget.owner);
    setTargetUid("");
    setTargetDir(`/${t("backup.restoreDirPrefix")}-${dayjs(snapshot.created_at).format("YYYYMMDD-HHmm")}`);
  }, [open, snapshot.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    // 快速切换目录时丢弃过期的响应
    let active = true;
    setLoading(true);
    dispatch(
      browseBackupSnapshot(
        location ? { snapshot_id: snapshot.id, uid: location.uid, path: location.path } : { snapshot_id: snapshot.id },
      ),
    )
      .then((res) => {
        if (!active) {
          return;
        }
        if (location) {
          setEntries(res.entries ?? []);
        } else {
          setUsers(res.users ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, snapshot.id, location]);

  const selectedItems = useMemo(() => Object.values(selected), [selected]);

  const toggle = (uid: number, path: string) => {
    setSelected((prev) => {
      const key = `${uid}:${path}`;
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      // 选中目录时移除其下已选中的子项，避免重复恢复
      const next: Record<string, BackupRestoreItem> = {};
      Object.entries(prev).forEach(([k, item]) => {
        if (!(item.uid === uid && isWithin(path, item.path))) {
          next[k] = item;
        }
      });
      next[key] = { uid, path };
      return next;
    });
  };

  const renderCheckbox = (uid: number, path: string) => {
    const self = !!selected[`${uid}:${path}`];
    // 自身已选中或被已选中的祖先目录覆盖
    const covered = selectedItems.some((item) => item.uid === uid && isWithin(item.path, path));
    return (
      <StyledCheckbox
        size="small"
        checked={covered}
        // 被祖先目录覆盖时不能单独取消
        disabled={covered && !self}
        onChange={() => toggle(uid, path)}
      />
    );
  };

  const pathSegments = useMemo(() => (location ? location.path.split("/").filter((s) => s !== "") : []), [location]);

  const submit = () => {
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    if (selectedItems.length == 0) {
      enqueueSnackbar(t("backup.restoreNothingSelected"), { variant: "warning", action: DefaultCloseAction });
      return;
    }

    setSubmitting(true);
    dispatch(
      restoreBackup({
        snapshot_id: snapshot.id,
        items: selectedItems,
        target_uid: target === RestoreTarget.user ? parseInt(targetUid) : undefined,
        target_dir: targetDir,
      }),
    )
      .then(() => {
        enqueueSnackbar(t("backup.restoreTaskCreated"), { variant: "success", action: DefaultCloseAction });
        onClose();
      })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  };

  const linkSx = {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" },
  };

  return (
    <DraggableDialog
      title={t("backup.restoreTitle", { name: snapshot.name })}
      showActions
      showCancel
      okText={t("backup.startRestore")}
      onAccept={submit}
      loading={submitting}
      disabled={selectedItems.length == 0}
      secondaryAction={
        <Typography variant="body2" color="text.secondary">
          {t("backup.selectedCount", { count: selectedItems.length })}
        </Typography>
      }
      dialogProps={{
        open,
        onClose,
        fullWidth: true,
        maxWidth: "md",
      }}
    >
      <DialogContent>
        <Stack spacing={2}>
          <Breadcrumbs separator={<ChevronRight fontSize="small" />}>
            {location ? (
              <Link component="button" variant="body2" color="inherit" onClick={() => setLocation(null)} sx={linkSx}>
                <People fontSize="small" sx={{ mr: 0.5 }} />
                {t("backup.allUsers")}
              </Link>
            ) : (
              <Typography variant="body2" color="text.primary" sx={{ display: "flex", alignItems: "center" }}>
                <People fontSize="small" sx={{ mr: 0.5 }} />
                {t("backup.allUsers")}
              </Typography>
            )}
            {location &&
              (pathSegments.length > 0 ? (
                <Link
                  component="button"
                  variant="body2"
                  color="inherit"
                  onClick={() => setLocation({ ...location, path: "/" })}
                  sx={linkSx}
                >
                  <Person fontSize="small" sx={{ mr: 0.5 }} />
                  {location.owner}
                </Link>
              ) : (
                <Typography variant="body2" color="text.primary" sx={{ display: "flex", alignItems: "center" }}>
                  <Person fontSize="small" sx={{ mr: 0.5 }} />
                  {location.owner}
                </Typography>
              ))}
            {location &&
              pathSegments.map((segment, index) =>
                index === pathSegments.length - 1 ? (
                  <Typography
                    key={index}
                    variant="body2"
                    color="text.primary"
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Folder fontSize="small" sx={{ mr: 0.5 }} />
                    {segment}
                  </Typography>
                ) : (
                  <Link
                    key={index}
                    component="button"
                    variant="body2"
                    color="inherit"
                    onClick={() => setLocation({ ...location, path: "/" + pathSegments.slice(0, index + 1).join("/") })}
                    sx={linkSx}
                  >
                    <Folder fontSize="small" sx={{ mr: 0.5 }} />
                    {segment}
                  </Link>
                ),
              )}
          </Breadcrumbs>

          <TableContainer component={StyledTableContainerPaper} sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <NoWrapTableCell sx={{ width: "100%" }}>
                    {location ? t("backup.name") : t("backup.owner")}
                  </NoWrapTableCell>
                  <NoWrapTableCell>{t("backup.size")}</NoWrapTableCell>
                  <NoWrapTableCell>{t("backup.fileCount")}</NoWrapTableCell>
                  {location && <NoWrapTableCell>{t("backup.modifiedAt")}</NoWrapTableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <FacebookCircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && (location ? entries.length : users.length) == 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("backup.emptyFolder")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  !location &&
                  users.map((user) => (
                    <TableRow hover key={user.uid}>
                      <TableCell padding="checkbox">{renderCheckbox(user.uid, "/")}</TableCell>
                      <NoWrapTableCell>
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => setLocation({ uid: user.uid, owner: user.owner, path: "/" })}
                          sx={linkSx}
                        >
                          <Person fontSize="small" sx={{ mr: 1 }} />
                          {user.owner}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {t("backup.uid", { uid: user.uid })}
                          </Typography>
                        </Link>
                      </NoWrapTableCell>
                      <NoWrapTableCell>{sizeToString(user.size)}</NoWrapTableCell>
                      <NoWrapTableCell>{user.files}</NoWrapTableCell>
                    </TableRow>
                  ))}
                {!loading &&
                  location &&
                  entries.map((entry) => (
                    <TableRow hover key={entry.path}>
                      <TableCell padding="checkbox">{renderCheckbox(location.uid, entry.path)}</TableCell>
                      <NoWrapTableCell>
                        {entry.is_dir ? (
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => setLocation({ ...location, path: entry.path })}
                            sx={linkSx}
                          >
                            <Folder fontSize="small" sx={{ mr: 1 }} />
                            {entry.name}
                          </Link>
                        ) : (
                          <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}>
                            <Document fontSize="small" sx={{ mr: 1 }} color="action" />
                            {entry.name}
                          </Typography>
                        )}
                      </NoWrapTableCell>
                      <NoWrapTableCell>{sizeToString(entry.size)}</NoWrapTableCell>
                      <NoWrapTableCell>{entry.is_dir ? entry.files : "-"}</NoWrapTableCell>
                      <NoWrapTableCell>
                        {entry.modified_at ? <TimeBadge variant="body2" datetime={entry.modified_at} /> : "-"}
                      </NoWrapTableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Stack spacing={2}>
              <SettingForm lgWidth={12} title={t("backup.restoreTarget")}>
                <RadioGroup row value={target} onChange={(e) => setTarget(e.target.value as RestoreTarget)}>
                  <FormControlLabel
                    value={RestoreTarget.owner}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">{t("backup.restoreToOwner")}</Typography>}
                  />
                  <FormControlLabel
                    value={RestoreTarget.user}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">{t("backup.restoreToUser")}</Typography>}
                  />
                </RadioGroup>
                {target === RestoreTarget.user && (
                  <Box sx={{ mt: 1 }}>
                    <DenseFilledTextField
                      fullWidth
                      required
                      placeholder={t("backup.targetUid")}
                      value={targetUid}
                      onChange={(e) => setTargetUid(e.target.value)}
                      slotProps={{
                        input: {
                          type: "number",
                          inputProps: {
                            min: 1,
                            step: 1,
                          },
                        },
                      }}
                    />
                    <NoMarginHelperText>{t("backup.targetUidDes")}</NoMarginHelperText>
                  </Box>
                )}
              </SettingForm>
              <SettingForm lgWidth={12} title={t("backup.targetDir")}>
                <DenseFilledTextField
                  fullWidth
                  required
                  value={targetDir}
                  onChange={(e) => setTargetDir(e.target.value)}
                  slotProps={{
                    input: {
                      inputProps: {
                        pattern: "/.*",
                        title: t("backup.targetDirPattern"),
                      },
                    },
                  }}
                />
                <NoMarginHelperText>{t("backup.targetDirDes")}</NoMarginHelperText>
              </SettingForm>
              <Alert severity="info" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
                {t("backup.restoreDes")}
              </Alert>
            </Stack>
          </form>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default RestoreDialog;
