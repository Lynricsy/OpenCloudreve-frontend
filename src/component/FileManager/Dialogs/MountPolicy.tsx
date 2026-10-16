import {
  DialogContent,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFileInfo, sendMountPolicy } from "../../../api/api.ts";
import { closeMountPolicyDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { loadPolicyOptions } from "../../../redux/thunks/file.ts";
import { refreshFileList } from "../../../redux/thunks/filemanager.ts";
import { getFileLinkedUri } from "../../../util";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import StorageOutlined from "../../Icons/StorageOutlined.tsx";
import { FileManagerIndex } from "../FileManager.tsx";

// 为目录挂载存储策略：此目录及子目录中新上传的文件将保存到所选策略
const MountPolicy = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const open = useAppSelector((state) => state.globalState.mountPolicyDialogOpen);
  const target = useAppSelector((state) => state.globalState.mountPolicyDialogFile);
  const policies = useAppSelector((state) => state.globalState.policyOptionCache);

  const [initializing, setInitializing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [policyId, setPolicyId] = useState("");

  useEffect(() => {
    if (!open || !target) {
      return;
    }

    setInitializing(true);
    setPolicyId("");
    // 用户组可用策略可能已被管理员修改，打开对话框时强制刷新
    Promise.all([
      dispatch(loadPolicyOptions(true)),
      dispatch(getFileInfo({ uri: getFileLinkedUri(target), extended: true })),
    ])
      .then(([, info]) => {
        // 目录未显式挂载时后端不返回 storage_policy，此时保持“继承”
        setPolicyId(info.extended_info?.storage_policy?.id ?? "");
      })
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, [open, target]);

  const onClose = useCallback(() => {
    dispatch(closeMountPolicyDialog());
  }, [dispatch]);

  const onAccept = useCallback(() => {
    if (!target) {
      return;
    }

    setLoading(true);
    dispatch(sendMountPolicy({ uri: getFileLinkedUri(target), policy_id: policyId }))
      .then(() => {
        dispatch(closeMountPolicyDialog());
        enqueueSnackbar({
          message: t("application:fileManager.mountPolicyUpdated"),
          variant: "success",
          action: DefaultCloseAction,
        });
        dispatch(refreshFileList(FileManagerIndex.main));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [target, policyId, dispatch]);

  const label = t("application:fileManager.storagePolicy");
  const selectable = policies ?? [];
  return (
    <DraggableDialog
      title={t("application:fileManager.mountPolicyTitle")}
      showActions
      showCancel
      loading={loading}
      disabled={initializing}
      onAccept={onAccept}
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "xs",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t("application:fileManager.mountPolicyDes")}
          </Typography>
          <FormControl variant="outlined" fullWidth>
            <InputLabel shrink>{label}</InputLabel>
            <Select
              variant="outlined"
              notched
              displayEmpty
              disabled={initializing}
              label={label}
              value={selectable.some((p) => p.id == policyId) ? policyId : ""}
              onChange={(e) => setPolicyId(e.target.value as string)}
              startAdornment={
                !isMobile && (
                  <InputAdornment position="start">
                    <StorageOutlined />
                  </InputAdornment>
                )
              }
            >
              <MenuItem value="">
                <em>{t("application:fileManager.mountPolicyInherit")}</em>
              </MenuItem>
              {selectable.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default MountPolicy;
