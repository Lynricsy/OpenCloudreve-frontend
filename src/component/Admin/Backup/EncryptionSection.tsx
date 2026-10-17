import {
  Alert,
  AlertTitle,
  Box,
  FormControl,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateBackupKey } from "../../../api/api";
import { BackupPlainKeyID } from "../../../api/dashboard";
import type { BackupStatus } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import { confirmOperation } from "../../../redux/thunks/dialog";
import { copyToClipboard } from "../../../util";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar";
import { DenseFilledTextField, SecondaryLoadingButton } from "../../Common/StyledComponents";
import ArrowSync from "../../Icons/ArrowSync";
import CopyOutlined from "../../Icons/CopyOutlined";
import Eye from "../../Icons/Eye";
import EyeOff from "../../Icons/EyeOff";
import LockClosedKey from "../../Icons/LockClosedKey";
import LockClosedOutlined from "../../Icons/LockClosedOutlined";
import SettingForm from "../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../Settings/Settings";
import { SettingContext } from "../Settings/SettingWrapper";
import { BackupCard, BackupCardHeader } from "./BackupUi";

export interface EncryptionSectionProps {
  status?: BackupStatus;
}

// 公钥展示块：等宽字体、可复制
const KeyIdBlock = ({ label, keyId }: { label: string; keyId: string }) => {
  const { t } = useTranslation("dashboard");
  return (
    <Box
      sx={(theme) => ({
        p: 1.5,
        pl: 2,
        borderRadius: `${theme.shape.borderRadius}px`,
        backgroundColor: theme.palette.action.hover,
        display: "flex",
        alignItems: "center",
        gap: 1,
      })}
    >
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
          {keyId}
        </Typography>
      </Box>
      <IconButton size="small" aria-label={t("backup.copy")} onClick={() => copyToClipboard(keyId)}>
        <CopyOutlined fontSize="small" />
      </IconButton>
    </Box>
  );
};

const EncryptionSection = ({ status }: EncryptionSectionProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { setSettings, values } = useContext(SettingContext);
  const [showKey, setShowKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  // 新生成（尚未保存）密钥对应的公钥
  const [generatedKeyId, setGeneratedKeyId] = useState<string | undefined>(undefined);

  const encrypt = values.gdrive_backup_encrypt === "1";
  const key = values.gdrive_backup_key ?? "";
  // 状态来自已保存的设置，开关改动保存前不影响这里
  const activeKeyId = status?.key_id && status.key_id !== BackupPlainKeyID ? status.key_id : undefined;

  const generate = () => {
    // 已有密钥时需确认，避免误替换
    const confirmed = key ? dispatch(confirmOperation(t("backup.replaceKeyConfirm"))) : Promise.resolve();
    confirmed
      .then(() => {
        setGenerating(true);
        return dispatch(generateBackupKey())
          .then((res) => {
            setSettings({ gdrive_backup_key: res.key });
            setGeneratedKeyId(res.key_id);
            setShowKey(true);
            enqueueSnackbar(t("backup.keyGenerated"), { variant: "info", action: DefaultCloseAction });
          })
          .finally(() => setGenerating(false));
      })
      .catch(() => {});
  };

  return (
    <Stack spacing={2}>
      <BackupCard>
        <BackupCardHeader
          icon={<LockClosedOutlined />}
          tone={activeKeyId ? "success" : "neutral"}
          title={activeKeyId ? t("backup.encryptionOn") : t("backup.encryptionOff")}
          subtitle={t("backup.enableEncryptionDes")}
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {t("backup.enableEncryption")}
              </Typography>
              <Switch
                checked={encrypt}
                inputProps={{ "aria-label": t("backup.enableEncryption") }}
                onChange={(e) => setSettings({ gdrive_backup_encrypt: e.target.checked ? "1" : "0" })}
              />
            </Stack>
          }
          dense={!activeKeyId}
        />
        {activeKeyId && <KeyIdBlock label={t("backup.activePublicKey")} keyId={activeKeyId} />}
      </BackupCard>

      {encrypt && (
        <BackupCard>
          <BackupCardHeader
            icon={<LockClosedKey />}
            tone="warning"
            title={t("backup.key")}
            subtitle={t("backup.keyDes")}
            action={
              <SecondaryLoadingButton
                variant="contained"
                startIcon={<ArrowSync />}
                loading={generating}
                onClick={generate}
              >
                <span>{t("backup.generateKey")}</span>
              </SecondaryLoadingButton>
            }
          />
          <Stack spacing={2}>
            <Alert severity="warning">
              <AlertTitle>{t("backup.keyWarningTitle")}</AlertTitle>
              <Box component="ul" sx={{ paddingInlineStart: "20px", m: 0 }}>
                {(t("backup.keyWarnings", { returnObjects: true }) as string[]).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </Box>
            </Alert>
            <SettingForm lgWidth={12}>
              <FormControl fullWidth>
                <DenseFilledTextField
                  required
                  type={showKey ? "text" : "password"}
                  value={key}
                  placeholder={"AGE-SECRET-KEY-1..."}
                  onChange={(e) => {
                    setSettings({ gdrive_backup_key: e.target.value });
                    setGeneratedKeyId(undefined);
                  }}
                  slotProps={{
                    htmlInput: { spellCheck: false, style: { fontFamily: "monospace" } },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label={t("backup.toggleVisibility")}
                            onClick={() => setShowKey((s) => !s)}
                          >
                            {showKey ? <EyeOff fontSize="small" /> : <Eye fontSize="small" />}
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={t("backup.copy")}
                            disabled={!key}
                            onClick={() => copyToClipboard(key)}
                          >
                            <CopyOutlined fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                {generatedKeyId && generatedKeyId !== activeKeyId && (
                  <NoMarginHelperText>{t("backup.keyGenerated")}</NoMarginHelperText>
                )}
              </FormControl>
            </SettingForm>
            {generatedKeyId && generatedKeyId !== activeKeyId && (
              <KeyIdBlock label={t("backup.newPublicKey")} keyId={generatedKeyId} />
            )}
          </Stack>
        </BackupCard>
      )}
    </Stack>
  );
};

export default EncryptionSection;
