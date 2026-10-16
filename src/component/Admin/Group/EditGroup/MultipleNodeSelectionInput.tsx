import { Box, ListItemText, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNodeList } from "../../../../api/api";
import { Node, NodeStatus } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { DenseSelect } from "../../../Common/StyledComponents";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu";
import { NodeStatusCondition } from "../../Common/NodeSelectionInput";

export interface MultipleNodeSelectionInputProps {
  // 选中的节点 ID，空数组表示全部节点
  value: number[];
  onChange: (value: number[]) => void;
}

const MultipleNodeSelectionInput = ({ value, onChange }: MultipleNodeSelectionInputProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    setLoading(true);
    dispatch(
      getNodeList({
        page_size: 1000,
        page: 1,
        order_by: "id",
        order_direction: "asc",
        conditions: {
          [NodeStatusCondition]: NodeStatus.active,
        },
      }),
    )
      .then((res) => {
        setNodes(res.nodes);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <DenseSelect
      multiple
      displayEmpty
      disabled={loading}
      value={value}
      onChange={(e) => onChange(e.target.value as number[])}
      sx={{
        minHeight: 39,
      }}
      MenuProps={{
        PaperProps: { sx: { maxWidth: 230 } },
        MenuListProps: {
          sx: {
            "& .MuiMenuItem-root": {
              whiteSpace: "normal",
            },
          },
        },
      }}
      renderValue={(selected) => {
        const ids = selected as number[];
        if (ids.length == 0) {
          return (
            <ListItemText
              primary={<em>{t("group.allNodes")}</em>}
              slotProps={{
                primary: { color: "textSecondary", variant: "body2" },
              }}
            />
          );
        }

        return (
          <ListItemText
            primary={ids.map((id) => nodes.find((n) => n.id == id)?.name ?? `#${id}`).join(", ")}
            slotProps={{
              primary: { variant: "body2" },
            }}
          />
        );
      }}
    >
      {nodes.map((n) => (
        <SquareMenuItem key={n.id} value={n.id}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant={"body2"} fontWeight={600}>
              {n.name}
            </Typography>
            {n.server && (
              <Typography variant={"caption"} color={"textSecondary"}>
                {n.server}
              </Typography>
            )}
          </Box>
        </SquareMenuItem>
      ))}
    </DenseSelect>
  );
};

export default MultipleNodeSelectionInput;
