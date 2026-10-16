import {
  Box,
  IconButton,
  ListItemText,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStoragePolicyList } from "../../../api/api";
import { LoadBalanceChild, StoragePolicy } from "../../../api/dashboard";
import { PolicyType } from "../../../api/explorer";
import { useAppDispatch } from "../../../redux/hooks";
import {
  DenseFilledTextField,
  DenseSelect,
  NoWrapTableCell,
  SecondaryButton,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents";
import { SquareMenuItem } from "../../FileManager/ContextMenu/ContextMenu";
import Add from "../../Icons/Add";
import Delete from "../../Icons/Delete";

export interface LoadBalanceChildrenEditorProps {
  value: LoadBalanceChild[];
  onChange: (value: LoadBalanceChild[]) => void;
  // 正在编辑的负载均衡策略自身 ID，新建时为 0
  selfId?: number;
}

// 负载均衡子策略编辑器：每行选择一个非负载均衡的存储策略并设置权重（最小为 1）。
const LoadBalanceChildrenEditor = ({ value, onChange, selfId }: LoadBalanceChildrenEditorProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [policies, setPolicies] = useState<StoragePolicy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    dispatch(getStoragePolicyList({ page: 1, page_size: 1000, order_by: "id", order_direction: "asc" }))
      .then((res) => {
        setPolicies(res.policies);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const candidates = useMemo(
    () => policies.filter((p) => p.type !== PolicyType.load_balance && p.id !== selfId),
    [policies, selfId],
  );

  const policyMap = useMemo(
    () =>
      policies.reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<number, StoragePolicy>,
      ),
    [policies],
  );

  const addRow = () => {
    const next = candidates.find((p) => !value.some((item) => item.id === p.id));
    onChange([...value, { id: next?.id ?? 0, weight: 1 }]);
  };

  return (
    <Box>
      {value.length > 0 && (
        <TableContainer sx={{ mt: 1 }} component={StyledTableContainerPaper}>
          <Table sx={{ width: "100%", tableLayout: "fixed" }} size="small">
            <TableHead>
              <TableRow>
                <NoWrapTableCell>{t("policy.childPolicy")}</NoWrapTableCell>
                <NoWrapTableCell width={120}>{t("policy.weight")}</NoWrapTableCell>
                <NoWrapTableCell width={64} />
              </TableRow>
            </TableHead>
            <TableBody>
              {value.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <DenseSelect
                      fullWidth
                      required
                      disabled={loading}
                      value={item.id > 0 && (policyMap[item.id] || loading) ? item.id : ""}
                      onChange={(e: SelectChangeEvent<unknown>) =>
                        onChange(value.map((row, i) => (i === index ? { ...row, id: e.target.value as number } : row)))
                      }
                      renderValue={(v) => (
                        <ListItemText
                          primary={policyMap[v as number]?.name ?? v}
                          slotProps={{ primary: { variant: "body2" } }}
                        />
                      )}
                    >
                      {candidates.map((p) => (
                        <SquareMenuItem
                          key={p.id}
                          value={p.id}
                          disabled={p.id !== item.id && value.some((other) => other.id === p.id)}
                        >
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography variant={"body2"} fontWeight={600}>
                              {p.name}
                            </Typography>
                            <Typography variant={"caption"} color={"textSecondary"}>
                              {t(`policy.${p.type}`)}
                            </Typography>
                          </Box>
                        </SquareMenuItem>
                      ))}
                    </DenseSelect>
                  </TableCell>
                  <TableCell>
                    <DenseFilledTextField
                      fullWidth
                      required
                      type="number"
                      slotProps={{ htmlInput: { min: 1, step: 1 } }}
                      // 允许输入过程中暂时清空（0 显示为空），表单校验 min=1 会阻止提交
                      value={item.weight || ""}
                      onChange={(e) =>
                        onChange(
                          value.map((row, i) =>
                            i === index ? { ...row, weight: Math.max(0, parseInt(e.target.value) || 0) } : row,
                          ),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => onChange(value.filter((_, i) => i !== index))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <SecondaryButton
        variant="contained"
        startIcon={<Add />}
        sx={{ mt: 1 }}
        disabled={loading || candidates.length <= value.length}
        onClick={addRow}
      >
        {t("policy.addTargetPolicy")}
      </SecondaryButton>
    </Box>
  );
};

export default LoadBalanceChildrenEditor;
