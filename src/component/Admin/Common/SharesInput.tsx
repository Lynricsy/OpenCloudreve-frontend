import {
  Box,
  debounce,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getShareDetail } from "../../../api/api.ts";
import { DefaultPinnedShare, Share } from "../../../api/dashboard.ts";
import { FileType } from "../../../api/explorer.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import {
  DenseAutocomplete,
  DenseFilledTextField,
  NoWrapBox,
  NoWrapCell,
  NoWrapTableCell,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents.tsx";
import FileTypeIcon from "../../FileManager/Explorer/FileTypeIcon.tsx";
import ArrowDown from "../../Icons/ArrowDown.tsx";
import Dismiss from "../../Icons/Dismiss.tsx";

export interface SharesInputProps {
  value: DefaultPinnedShare[];
  onChange: (value: DefaultPinnedShare[]) => void;
}

const shareFileName = (share: Share) => share.edges?.file?.name ?? `#${share.id}`;

const SharesInput = ({ value, onChange }: SharesInputProps) => {
  const theme = useTheme();
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);

  // 按数字 ID 查找分享；不存在时不提示错误，仅清空候选项
  const searchShare = useMemo(
    () =>
      debounce((keyword: string) => {
        const id = parseInt(keyword);
        if (!/^\d+$/.test(keyword) || isNaN(id) || id <= 0) {
          setOptions([]);
          setLoading(false);
          return;
        }

        dispatch(getShareDetail(id, true))
          .then((share) => setOptions([share]))
          .catch(() => setOptions([]))
          .finally(() => setLoading(false));
      }, 300),
    [dispatch],
  );

  useEffect(() => {
    const keyword = input.trim();
    if (keyword == "") {
      setOptions([]);
      return;
    }

    setLoading(true);
    searchShare(keyword);
  }, [input, searchShare]);

  const onSelect = useCallback(
    (share: Share | null) => {
      setInput("");
      setOptions([]);
      if (!share || value.some((v) => v.share_id == share.id)) {
        return;
      }

      onChange([...value, { share_id: share.id, name: shareFileName(share) }]);
    },
    [value, onChange],
  );

  const moveRow = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= value.length) {
        return;
      }
      const next = [...value];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <Stack spacing={1}>
      {value.length > 0 && (
        <TableContainer component={StyledTableContainerPaper}>
          <Table sx={{ width: "100%", tableLayout: "fixed" }} size="small">
            <TableHead>
              <TableRow>
                <NoWrapTableCell width={72}>{t("group.pinnedShare")}</NoWrapTableCell>
                <NoWrapTableCell>{t("group.pinnedDisplayName")}</NoWrapTableCell>
                <NoWrapTableCell width={124}>{t("settings.actions")}</NoWrapTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {value.map((v, i) => (
                <TableRow key={v.share_id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }} hover>
                  <NoWrapCell>
                    <Typography variant={"body2"}>#{v.share_id}</Typography>
                  </NoWrapCell>
                  <NoWrapCell>
                    <DenseFilledTextField
                      fullWidth
                      required
                      value={v.name}
                      onChange={(e) => onChange(value.map((p, j) => (j == i ? { ...p, name: e.target.value } : p)))}
                    />
                  </NoWrapCell>
                  <NoWrapCell>
                    <IconButton size={"small"} onClick={() => onChange(value.filter((_, j) => j != i))}>
                      <Dismiss fontSize={"small"} />
                    </IconButton>
                    <IconButton size="small" onClick={() => moveRow(i, i - 1)} disabled={i == 0}>
                      <ArrowDown sx={{ width: "18px", height: "18px", transform: "rotate(180deg)" }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => moveRow(i, i + 1)} disabled={i == value.length - 1}>
                      <ArrowDown sx={{ width: "18px", height: "18px" }} />
                    </IconButton>
                  </NoWrapCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <DenseAutocomplete
        options={options}
        value={null}
        inputValue={input}
        loading={loading}
        blurOnSelect
        filterOptions={(x) => x}
        getOptionLabel={(option) => (typeof option === "string" ? option : shareFileName(option as Share))}
        isOptionEqualToValue={(option, val) => (option as Share).id == (val as Share).id}
        getOptionDisabled={(option) => value.some((v) => v.share_id == (option as Share).id)}
        noOptionsText={input.trim() == "" ? t("settings.searchShare") : t("group.pinnedShareNotFound")}
        onInputChange={(_e, newValue, reason) => {
          if (reason !== "reset") {
            setInput(newValue);
          }
        }}
        onChange={(_e, newValue) => onSelect(newValue as Share | null)}
        renderOption={(props, option) => {
          const share = option as Share;
          return (
            <li {...props} key={share.id}>
              <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                <FileTypeIcon
                  sx={{ mr: 1 }}
                  name={share.edges?.file?.name ?? ""}
                  fileType={share.edges?.file?.type ?? FileType.folder}
                />
                <NoWrapBox>
                  <Typography variant={"body2"} component={"span"}>
                    {shareFileName(share)}
                  </Typography>
                  <Typography variant={"body2"} component={"span"} color={"text.secondary"} sx={{ ml: 1 }}>
                    #{share.id}
                  </Typography>
                </NoWrapBox>
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <DenseFilledTextField
            {...params}
            sx={{
              "& .MuiInputBase-root.MuiOutlinedInput-root": {
                paddingTop: theme.spacing(0.6),
                paddingBottom: theme.spacing(0.6),
              },
              mt: 0,
            }}
            variant="outlined"
            margin="dense"
            placeholder={t("settings.searchShare")}
            type="text"
            fullWidth
          />
        )}
      />
    </Stack>
  );
};

export default SharesInput;
