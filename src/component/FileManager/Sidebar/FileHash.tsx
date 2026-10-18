import { Box, IconButton, Link, Skeleton, Tooltip } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFileHash } from "../../../api/api.ts";
import { FileHashItem, FileHashStatus, FileResponse } from "../../../api/explorer.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import SessionManager from "../../../session/index.ts";
import { copyToClipboard } from "../../../util";
import CrUri, { Filesystem } from "../../../util/uri.ts";
import CopyOutlined from "../../Icons/CopyOutlined.tsx";
import InfoRow from "./InfoRow.tsx";

// 计算中状态的轮询间隔
const pollInterval = 3000;

export interface FileHashProps {
  target: FileResponse;
}

// 文件详情中的 SHA-256 行，仅用于文件
const FileHash = ({ target }: FileHashProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const path = target.path;

  // undefined: 加载中；null: 查询失败
  const [hash, setHash] = useState<FileHashItem | undefined | null>(undefined);
  const [computing, setComputing] = useState(false);
  // 记录当前展示的文件，丢弃切换文件之前发出请求的结果
  const pathRef = useRef(path);
  pathRef.current = path;

  // 只有登录用户在 my 文件系统（自己的空间，或管理员访问 <uid>@my）下才能发起计算
  const canCompute = useMemo(() => {
    if (!SessionManager.currentLoginOrNull()) {
      return false;
    }
    try {
      return new CrUri(path).fs() == Filesystem.my;
    } catch (e) {
      return false;
    }
  }, [path]);

  const fetchHash = useCallback(
    async (compute?: boolean) => {
      const res = await dispatch(getFileHash({ uris: [path], compute }, !compute));
      return res.items?.[0] ?? null;
    },
    [path, dispatch],
  );

  // 打开详情或切换文件时加载
  useEffect(() => {
    let cancelled = false;
    setHash(undefined);
    setComputing(false);
    fetchHash()
      .then((item) => !cancelled && setHash(item))
      .catch(() => !cancelled && setHash(null));
    return () => {
      cancelled = true;
    };
  }, [fetchHash]);

  // 计算中时定时轮询，状态变化或面板关闭后停止
  useEffect(() => {
    if (hash?.status != FileHashStatus.pending) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchHash()
        .then((item) => !cancelled && setHash(item))
        .catch(() => !cancelled && setHash(null));
    }, pollInterval);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hash, fetchHash]);

  const onCompute = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const requestPath = path;
      setComputing(true);
      fetchHash(true)
        .then((item) => {
          if (pathRef.current == requestPath) {
            setHash(item);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (pathRef.current == requestPath) {
            setComputing(false);
          }
        });
    },
    [path, fetchHash],
  );

  const computeLink = useMemo(() => {
    if (!canCompute) {
      return null;
    }
    if (computing) {
      return <Skeleton variant={"text"} width={30} sx={{ display: "inline-block", ml: 1 }} />;
    }
    return (
      <Link href={"#"} onClick={onCompute} underline={"hover"} sx={{ ml: 1 }}>
        {t("application:fileManager.calculate")}
      </Link>
    );
  }, [canCompute, computing, onCompute, t]);

  const content = useMemo(() => {
    if (hash === undefined) {
      return <Skeleton variant={"text"} width={75} />;
    }
    if (hash === null) {
      return t("application:fileManager.sha256LoadFailed");
    }
    switch (hash.status) {
      case FileHashStatus.ready:
        return (
          <Box component={"span"} sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            <Box component={"span"} sx={{ fontFamily: "monospace", wordBreak: "break-all", minWidth: 0 }}>
              {hash.sha256}
            </Box>
            <Tooltip title={t("application:fileManager.copyToClipboard")}>
              <IconButton size={"small"} sx={{ mt: -0.5 }} onClick={() => copyToClipboard(hash.sha256 ?? "")}>
                <CopyOutlined fontSize={"small"} />
              </IconButton>
            </Tooltip>
          </Box>
        );
      case FileHashStatus.pending:
        return t("application:fileManager.sha256Pending");
      case FileHashStatus.uploading:
        return t("application:fileManager.sha256Uploading");
      case FileHashStatus.missing:
        return (
          <>
            {t("application:fileManager.sha256Missing")}
            {computeLink}
          </>
        );
      case FileHashStatus.failed:
        return (
          <>
            {t("application:fileManager.sha256Failed", {
              reason: hash.reason
                ? t(`application:fileManager.sha256FailReasons.${hash.reason}`, { defaultValue: hash.reason })
                : "-",
            })}
            {computeLink}
          </>
        );
      case FileHashStatus.unsupported:
        return t("application:fileManager.sha256Unsupported");
      default:
        return hash.reason
          ? t("application:fileManager.sha256Error", { reason: hash.reason })
          : t("application:fileManager.sha256LoadFailed");
    }
  }, [hash, computeLink, t]);

  if (hash?.status == FileHashStatus.not_file) {
    return null;
  }

  return <InfoRow title={t("application:fileManager.sha256")} content={content} />;
};

export default FileHash;
