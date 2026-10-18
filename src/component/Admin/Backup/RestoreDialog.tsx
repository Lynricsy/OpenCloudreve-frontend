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
import { browseBackupSnapshot, restoreBackup } from "../../../api/api";
import type {
  BackupRestoreItem,
  BackupSnapshot,
  BackupSnapshotEntry,
  BackupSnapshotUser,
} from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import { sizeToString } from "../../../util";
import FacebookCircularProgress from "../../Common/CircularProgress";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import {
  DenseFilledTextField,
  NoWrapTableCell,
  SecondaryButton,
  StyledCheckbox,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import DraggableDialog from "../../Dialogs/DraggableDialog";
import ChevronRight from "../../Icons/ChevronRight";
import Document from "../../Icons/Document";
import Folder from "../../Icons/Folder";
import People from "../../Icons/People";
import Person from "../../Icons/Person";
import SettingForm from "../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../Settings/Settings";

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

// 恢复位置：原位置按快照中的完整原始路径恢复（keep_path），指定目录以所选项的父目录为基准
enum RestoreLocation {
  original = "original",
  dir = "dir",
}

// 一次目录浏览的结果，与其所属的快照和浏览位置绑定
interface BrowseListing {
  key: string;
  users: BackupSnapshotUser[];
  entries: BackupSnapshotEntry[];
}

// 判断 path 是否为 parent 本身或位于 parent 之下
const isWithin = (parent: string, path: string) => parent === "/" || path === parent || path.startsWith(parent + "/");

const RestoreDialog = ({ open, onClose, snapshot }: RestoreDialogProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formRef = useRef<HTMLFormElement>(null);

  const [location, setLocation] = useState<BrowseLocation | null>(null);
  const [listing, setListing] = useState<BrowseListing | null>(null);
  // 加载失败的浏览位置；与当前位置一致时显示错误与重试
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [selected, setSelected] = useState<Record<string, BackupRestoreItem>>({});
  const [target, setTarget] = useState<RestoreTarget>(RestoreTarget.owner);
  const [targetUid, setTargetUid] = useState("");
  const [restoreLocation, setRestoreLocation] = useState<RestoreLocation>(RestoreLocation.dir);
  const [targetDir, setTargetDir] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 只展示属于当前浏览位置的结果，位置切换或加载失败后不会留下其他位置的旧条目
  const currentKey = JSON.stringify([snapshot.id, location?.uid ?? null, location?.path ?? null]);
  const current = listing?.key === currentKey ? listing : undefined;
  const failed = failedKey === currentKey;
  const loading = !current && !failed;
  const users = current?.users ?? [];
  const entries = current?.entries ?? [];

  // 打开对话框或切换快照时重置状态
  useEffect(() => {
    if (!open) {
      return;
    }
    setLocation(null);
    setListing(null);
    setFailedKey(null);
    setSelected({});
    setTarget(RestoreTarget.owner);
    setTargetUid("");
    setRestoreLocation(RestoreLocation.dir);
    setTargetDir(`/${t("backup.restoreDirPrefix")}-${dayjs(snapshot.created_at).format("YYYYMMDD-HHmm")}`);
  }, [open, snapshot.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    // 快速切换目录时丢弃过期的响应
    let active = true;
    dispatch(
      browseBackupSnapshot(
        location ? { snapshot_id: snapshot.id, uid: location.uid, path: location.path } : { snapshot_id: snapshot.id },
      ),
    )
      .then((res) => {
        if (!active) {
          return;
        }
        setListing({ key: currentKey, users: res.users ?? [], entries: res.entries ?? [] });
      })
      .catch(() => {
        if (active) {
          setFailedKey(currentKey);
        }
      });
    return () => {
      active = false;
    };
  }, [open, snapshot.id, location, reloadSeq]);

  const retryBrowse = () => {
    setFailedKey(null);
    setReloadSeq((seq) => seq + 1);
  };

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

  const renderCheckbox = (uid: number, path: string, label: string) => {
    const self = !!selected[`${uid}:${path}`];
    // 自身已选中或被已选中的祖先目录覆盖
    const covered = selectedItems.some((item) => item.uid === uid && isWithin(item.path, path));
    return (
      <StyledCheckbox
        size="small"
        checked={covered}
        // 被祖先目录覆盖时不能单独取消
        disabled={covered && !self}
        inputProps={{ "aria-label": label }}
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
    let uid: number | undefined = undefined;
    if (target === RestoreTarget.user) {
      // 按数值整体解析（如 1e2 即 100），不能用 parseInt 截取前缀
      uid = Number(targetUid);
      if (!Number.isSafeInteger(uid) || uid <= 0) {
        enqueueSnackbar(t("backup.targetUidInvalid"), { variant: "warning", action: DefaultCloseAction });
        return;
      }
    }
    const keepPath = restoreLocation === RestoreLocation.original;

    setSubmitting(true);
    dispatch(
      restoreBackup({
        snapshot_id: snapshot.id,
        items: selectedItems,
        target_uid: uid,
        // 恢复到原位置时后端忽略目标目录
        target_dir: keepPath ? "" : targetDir,
        keep_path: keepPath,
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
                {failed && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Stack spacing={1} alignItems="center" sx={{ py: 1 }} role="alert">
                        <Typography variant="body2" color="error">
                          {t("backup.browseFailed")}
                        </Typography>
                        <SecondaryButton size="small" variant="contained" onClick={retryBrowse}>
                          {t("application:uploader.retry")}
                        </SecondaryButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {current && (location ? entries.length : users.length) == 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("backup.emptyFolder")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {current &&
                  !location &&
                  users.map((user) => (
                    <TableRow hover key={user.uid}>
                      <TableCell padding="checkbox">
                        {renderCheckbox(
                          user.uid,
                          "/",
                          t("backup.selectUserLabel", { owner: user.owner, uid: user.uid }),
                        )}
                      </TableCell>
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
                {current &&
                  location &&
                  entries.map((entry) => (
                    <TableRow hover key={entry.path}>
                      <TableCell padding="checkbox">
                        {renderCheckbox(
                          location.uid,
                          entry.path,
                          t("backup.selectEntryLabel", { owner: location.owner, path: entry.path }),
                        )}
                      </TableCell>
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
              <SettingForm lgWidth={12} title={t("backup.restoreLocation")}>
                <RadioGroup
                  row
                  value={restoreLocation}
                  onChange={(e) => setRestoreLocation(e.target.value as RestoreLocation)}
                >
                  <FormControlLabel
                    value={RestoreLocation.original}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">{t("backup.restoreToOriginalPath")}</Typography>}
                  />
                  <FormControlLabel
                    value={RestoreLocation.dir}
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">{t("backup.restoreToTargetDir")}</Typography>}
                  />
                </RadioGroup>
                <Box sx={{ mt: 1 }}>
                  <DenseFilledTextField
                    fullWidth
                    required
                    // 恢复到原位置时不使用目标目录；禁用的输入不参与表单校验
                    disabled={restoreLocation === RestoreLocation.original}
                    placeholder={t("backup.targetDir")}
                    value={targetDir}
                    onChange={(e) => setTargetDir(e.target.value)}
                    slotProps={{
                      input: {
                        inputProps: {
                          pattern: "/.*",
                          title: t("backup.targetDirPattern"),
                          "aria-label": t("backup.targetDir"),
                        },
                      },
                    }}
                  />
                  <NoMarginHelperText>
                    {restoreLocation === RestoreLocation.original ? t("backup.keepPathDes") : t("backup.targetDirDes")}
                  </NoMarginHelperText>
                </Box>
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
