import {
  Alert,
  AlertTitle,
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useContext, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { generateBackupKey } from "../../../../api/api";
import { BackupPlainKeyID } from "../../../../api/dashboard";
import type { BackupStatus } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { confirmOperation } from "../../../../redux/thunks/dialog";
import { copyToClipboard } from "../../../../util";
import { Code } from "../../../Common/Code";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar";
import { DenseFilledTextField, SecondaryLoadingButton } from "../../../Common/StyledComponents";
import ArrowSync from "../../../Icons/ArrowSync";
import CopyOutlined from "../../../Icons/CopyOutlined";
import Eye from "../../../Icons/Eye";
import EyeOff from "../../../Icons/EyeOff";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../Settings";
import { SettingContext } from "../SettingWrapper";

export interface EncryptionSectionProps {
  status?: BackupStatus;
}

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
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("backup.encryption")}
      </Typography>
      <SettingSectionContent>
        <SettingForm lgWidth={5}>
          <FormControl fullWidth>
            <FormControlLabel
              control={
                <Switch
                  checked={encrypt}
                  onChange={(e) => setSettings({ gdrive_backup_encrypt: e.target.checked ? "1" : "0" })}
                />
              }
              label={t("backup.enableEncryption")}
            />
            <NoMarginHelperText>{t("backup.enableEncryptionDes")}</NoMarginHelperText>
          </FormControl>
        </SettingForm>
        {encrypt && (
          <>
            <SettingForm lgWidth={5}>
              <Alert severity="warning" sx={{ fontSize: (theme) => theme.typography.body2.fontSize }}>
                <AlertTitle>{t("backup.keyWarningTitle")}</AlertTitle>
                <ul style={{ paddingInlineStart: "20px", margin: 0 }}>
                  {(t("backup.keyWarnings", { returnObjects: true }) as string[]).map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            </SettingForm>
            <SettingForm title={t("backup.key")} lgWidth={5}>
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
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowKey((s) => !s)}>
                            {showKey ? <EyeOff fontSize="small" /> : <Eye fontSize="small" />}
                          </IconButton>
                          <IconButton size="small" disabled={!key} onClick={() => copyToClipboard(key)}>
                            <CopyOutlined fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <NoMarginHelperText>{t("backup.keyDes")}</NoMarginHelperText>
                {activeKeyId && (
                  <NoMarginHelperText sx={{ overflowWrap: "anywhere" }}>
                    <Trans
                      i18nKey="backup.activeKeyId"
                      ns="dashboard"
                      values={{ keyId: activeKeyId }}
                      components={[<Code />]}
                    />
                  </NoMarginHelperText>
                )}
                {generatedKeyId && generatedKeyId !== activeKeyId && (
                  <NoMarginHelperText sx={{ overflowWrap: "anywhere" }}>
                    <Trans
                      i18nKey="backup.newKeyId"
                      ns="dashboard"
                      values={{ keyId: generatedKeyId }}
                      components={[<Code />]}
                    />
                  </NoMarginHelperText>
                )}
              </FormControl>
              <Box sx={{ mt: 1 }}>
                <SecondaryLoadingButton
                  variant="contained"
                  size="small"
                  startIcon={<ArrowSync />}
                  loading={generating}
                  onClick={generate}
                >
                  <span>{t("backup.generateKey")}</span>
                </SecondaryLoadingButton>
              </Box>
            </SettingForm>
          </>
        )}
      </SettingSectionContent>
    </SettingSection>
  );
};

export default EncryptionSection;
