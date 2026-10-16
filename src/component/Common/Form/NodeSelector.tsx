import { FormControl, InputAdornment, InputLabel, MenuItem, Select, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getWorkflowNodes } from "../../../api/api.ts";
import { GroupPermission } from "../../../api/user.ts";
import { NodeSummary } from "../../../api/workflow.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import SessionManager from "../../../session";
import Server from "../../Icons/Server.tsx";

export interface NodeSelectorProps {
  // 任务所需的节点能力，取值见 NodeCapability
  capability: number;
  // 选中节点的 hashid，空字符串表示自动分配
  value: string;
  onChange: (value: string) => void;
  // 对话框是否打开；打开时重新加载节点列表
  open?: boolean;
}

// 创建任务时选择处理节点，用户组未开启“允许选择节点”时不渲染
const NodeSelector = ({ capability, value, onChange, open }: NodeSelectorProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const enabled = SessionManager.currentUserGroupPermission().enabled(GroupPermission.select_node);

  useEffect(() => {
    if (!enabled || open === false) {
      return;
    }

    setLoading(true);
    dispatch(getWorkflowNodes(capability))
      .then((res) => {
        setNodes(res);
        // 已选节点不再可用时回退为自动分配
        if (value && !res.some((n) => n.id == value)) {
          onChange("");
        }
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [enabled, open, capability]);

  if (!enabled) {
    return null;
  }

  const label = t("application:fileManager.processingNode");
  return (
    <FormControl variant="outlined" fullWidth>
      <InputLabel shrink>{label}</InputLabel>
      <Select
        variant="outlined"
        notched
        displayEmpty
        disabled={loading}
        label={label}
        value={nodes.some((n) => n.id == value) ? value : ""}
        onChange={(e) => onChange(e.target.value as string)}
        startAdornment={
          !isMobile && (
            <InputAdornment position="start">
              <Server />
            </InputAdornment>
          )
        }
      >
        <MenuItem value="">
          <em>{t("application:fileManager.autoAssignNode")}</em>
        </MenuItem>
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default NodeSelector;
