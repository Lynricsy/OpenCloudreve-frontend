import { alpha, Box, Paper, Stack, styled, Typography } from "@mui/material";
import type { Theme } from "@mui/material";
import type { ReactNode } from "react";

export enum BackupPageTab {
  Overview = "overview",
  Account = "account",
  Settings = "settings",
  Encryption = "encryption",
  Snapshots = "snapshots",
  History = "history",
}

// 语义色调：neutral 用于没有状态含义的图标
export type BackupTone = "primary" | "success" | "warning" | "error" | "neutral";

const toneColor = (theme: Theme, tone: BackupTone) =>
  tone === "neutral" ? theme.palette.text.secondary : theme.palette[tone].main;

// 与后台首页一致的描边卡片
export const BackupCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  boxShadow: "none",
  border: `1px solid ${theme.palette.divider}`,
  height: "100%",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export interface ToneIconProps {
  tone?: BackupTone;
  size?: number;
  children: ReactNode;
}

// 带浅色底的图标块，底色由语义色按透明度生成，深色模式下同样适用
export const ToneIcon = ({ tone = "neutral", size = 40, children }: ToneIconProps) => (
  <Box
    aria-hidden
    sx={(theme) => ({
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: `${theme.shape.borderRadius}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: toneColor(theme, tone),
      backgroundColor: tone === "neutral" ? theme.palette.action.hover : alpha(toneColor(theme, tone), 0.12),
      "& svg": { fontSize: size * 0.55 },
    })}
  >
    {children}
  </Box>
);

export interface BackupCardHeaderProps {
  icon: ReactNode;
  tone?: BackupTone;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  // 标题下方是否还有内容，决定底部间距
  dense?: boolean;
}

export const BackupCardHeader = ({ icon, tone, title, subtitle, action, dense }: BackupCardHeaderProps) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={2}
    alignItems={{ xs: "stretch", sm: "center" }}
    justifyContent="space-between"
    sx={{ mb: dense ? 0 : 2.5 }}
  >
    <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
      <ToneIcon tone={tone}>{icon}</ToneIcon>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.4 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ overflowWrap: "anywhere" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
    {action && (
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0, alignItems: "center" }}>{action}</Box>
    )}
  </Stack>
);

export interface StatTileProps {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: BackupTone;
}

// 统计数字块：小标签在上、数值在下，数值使用等宽数字
export const StatTile = ({ icon, label, value, hint, tone }: StatTileProps) => (
  <Box
    sx={(theme) => ({
      height: "100%",
      p: 2,
      borderRadius: `${theme.shape.borderRadius}px`,
      backgroundColor: theme.palette.action.hover,
      display: "flex",
      flexDirection: "column",
      gap: 0.5,
      minWidth: 0,
    })}
  >
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{ color: "text.secondary", "& svg": { fontSize: 16 } }}
    >
      {icon}
      <Typography variant="caption" noWrap>
        {label}
      </Typography>
    </Stack>
    <Typography
      variant="h6"
      component="div"
      sx={(theme) => ({
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.3,
        overflowWrap: "anywhere",
        color: tone && tone !== "neutral" ? theme.palette[tone].main : undefined,
      })}
    >
      {value}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
        {hint}
      </Typography>
    )}
  </Box>
);

// 长标识（公钥、快照名）中间截断，完整内容放在 title 中
export const middleEllipsis = (value: string, head = 12, tail = 8) =>
  value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
