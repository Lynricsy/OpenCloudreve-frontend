import {
  DialogContent,
  FormControl,
  InputAdornment,
  InputLabel,
  ListItemText,
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
import { sendRelocate } from "../../../api/api.ts";
import { PolicyType } from "../../../api/explorer.ts";
import { closeRelocateDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { loadPolicyOptions } from "../../../redux/thunks/file.ts";
import { getFileLinkedUri } from "../../../util";
import { ViewTaskAction } from "../../Common/Snackbar/snackbar.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import StorageOutlined from "../../Icons/StorageOutlined.tsx";

// 将所选文件（含子目录）的全部实体转移到目标存储策略
const Relocate = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const open = useAppSelector((state) => state.globalState.relocateDialogOpen);
  const targets = useAppSelector((state) => state.globalState.relocateDialogFiles);
  const policies = useAppSelector((state) => state.globalState.policyOptionCache);

  const [initializing, setInitializing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [policyId, setPolicyId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setPolicyId("");
    setInitializing(true);
    // 用户组可用策略可能已被管理员修改，打开对话框时强制刷新
    dispatch(loadPolicyOptions(true))
      .catch(() => {})
      .finally(() => setInitializing(false));
  }, [open]);

  const onClose = useCallback(() => {
    dispatch(closeRelocateDialog());
  }, [dispatch]);

  const onAccept = useCallback(() => {
    if (!targets || !policyId) {
      return;
    }

    setLoading(true);
    dispatch(
      sendRelocate({
        src: targets.map((f) => getFileLinkedUri(f)),
        dst_policy_id: policyId,
      }),
    )
      .then(() => {
        dispatch(closeRelocateDialog());
        enqueueSnackbar({
          message: t("modals.taskCreated"),
          variant: "success",
          action: ViewTaskAction(),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targets, policyId, dispatch]);

  const label = t("application:fileManager.storagePolicy");
  const selectable = policies ?? [];
  return (
    <DraggableDialog
      title={t("application:fileManager.relocation")}
      showActions
      showCancel
      loading={loading}
      disabled={initializing || !policyId}
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
            {t("application:fileManager.relocateDes")}
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
              renderValue={(value) =>
                selectable.find((p) => p.id == value)?.name ?? (
                  <em>{t("application:fileManager.selectRelocateTarget")}</em>
                )
              }
              startAdornment={
                !isMobile && (
                  <InputAdornment position="start">
                    <StorageOutlined />
                  </InputAdornment>
                )
              }
            >
              {selectable.map((p) => {
                // 负载均衡策略自身不存储数据，加密策略会改变实体格式，均不能作为转移目标
                const supported = p.type != PolicyType.load_balance && !p.encryption;
                return (
                  <MenuItem key={p.id} value={p.id} disabled={!supported}>
                    <ListItemText
                      primary={p.name}
                      secondary={supported ? undefined : t("application:fileManager.relocateUnsupported")}
                      slotProps={{ primary: { variant: "body2" } }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

export default Relocate;
