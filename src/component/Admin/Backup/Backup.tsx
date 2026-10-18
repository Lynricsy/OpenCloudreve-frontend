import { Box, Container } from "@mui/material";
import { useQueryState } from "nuqs";
import { ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { getBackupStatus } from "../../../api/api";
import type { BackupStatus } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import ResponsiveTabs, { Tab } from "../../Common/ResponsiveTabs";
import Archive from "../../Icons/Archive";
import HistoryOutlined from "../../Icons/HistoryOutlined";
import LockClosedOutlined from "../../Icons/LockClosedOutlined";
import PersonOutlined from "../../Icons/PersonOutlined";
import Pulse from "../../Icons/Pulse";
import SettingsOutlined from "../../Icons/SettingsOutlined";
import PageContainer from "../../Pages/PageContainer";
import PageHeader, { PageTabQuery } from "../../Pages/PageHeader";
import SettingsWrapper, { SettingContext } from "../Settings/SettingWrapper";
import AccountSection from "./AccountSection";
import BackupHistory from "./BackupHistory";
import BackupSettingsSection from "./BackupSettingsSection";
import EncryptionSection from "./EncryptionSection";
import RunStatusSection from "./RunStatusSection";
import SnapshotSection from "./SnapshotSection";
import { BackupPageTab } from "./BackupUi";

// 备份任务运行时状态轮询间隔
const runningPollInterval = 5000;

// 各页签读取与保存的设置项。必须是模块级常量：SettingsWrapper 以数组引用为依赖重新拉取设置，
// 内联数组会让父组件每次刷新状态时都重新拉取，并丢掉未保存的修改
const accountSettings = ["gdrive_backup_client_id", "gdrive_backup_client_secret", "gdrive_backup_proxy"];
const backupSettings = [
  "gdrive_backup_enabled",
  "gdrive_backup_policies",
  "cron_gdrive_backup",
  "gdrive_backup_retention_days",
  "gdrive_backup_daily_limit",
];
const encryptionSettings = ["gdrive_backup_encrypt", "gdrive_backup_key"];
const snapshotSettings = ["gdrive_backup_retention_days"];

// 把 SettingsWrapper 的 formRef 绑定到页签内容，保存前校验必填项
const SettingTabForm = ({ children }: { children: ReactNode }) => {
  const { formRef } = useContext(SettingContext);
  return (
    <Box component={"form"} ref={formRef} onSubmit={(e) => e.preventDefault()}>
      {children}
    </Box>
  );
};

// 备份状态（授权、密钥、最近任务）由各页签共享；有备份任务在执行时定时静默刷新，任务结束后停止
const useBackupStatus = () => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<BackupStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    dispatch(getBackupStatus())
      .then((res) => setStatus(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!status?.running) {
      return;
    }
    const timer = setInterval(() => {
      dispatch(getBackupStatus())
        .then((res) => setStatus(res))
        .catch(() => {});
    }, runningPollInterval);
    return () => clearInterval(timer);
  }, [status?.running, dispatch]);

  return { status, loading, refresh };
};

// 后台侧边栏“备份”页面：按运行状态、账号、备份设置、加密、快照与恢复、运行记录分页签展示，
// 设置类页签各自由 SettingsWrapper 读取与保存
const BackupPage = () => {
  const { t } = useTranslation("dashboard");
  const [tab, setTab] = useQueryState(PageTabQuery);
  const { status, loading, refresh } = useBackupStatus();

  const tabs: Tab<BackupPageTab>[] = useMemo(
    () => [
      {
        label: t("backup.runStatus"),
        value: BackupPageTab.Overview,
        icon: <Pulse />,
      },
      {
        label: t("backup.googleAccount"),
        value: BackupPageTab.Account,
        icon: <PersonOutlined />,
      },
      {
        label: t("backup.backupSettings"),
        value: BackupPageTab.Settings,
        icon: <SettingsOutlined />,
      },
      {
        label: t("backup.encryption"),
        value: BackupPageTab.Encryption,
        icon: <LockClosedOutlined />,
      },
      {
        label: t("backup.snapshots"),
        value: BackupPageTab.Snapshots,
        icon: <Archive />,
      },
      {
        label: t("backup.historyTab"),
        value: BackupPageTab.History,
        icon: <HistoryOutlined />,
      },
    ],
    [t],
  );

  const current = tabs.some((item) => item.value === tab) ? (tab as BackupPageTab) : BackupPageTab.Overview;

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <PageHeader title={t("nav.backup")} />
        <ResponsiveTabs value={current} onChange={(_e, newValue) => setTab(newValue)} tabs={tabs} />
        <SwitchTransition>
          <CSSTransition
            addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
            classNames="fade"
            key={current}
          >
            <Box>
              {current === BackupPageTab.Overview && (
                <Box sx={{ mt: 3 }}>
                  <RunStatusSection status={status} loading={loading} onRefresh={refresh} onNavigate={setTab} />
                </Box>
              )}
              {current === BackupPageTab.Account && (
                <SettingsWrapper settings={accountSettings} onSaved={refresh}>
                  <SettingTabForm>
                    <AccountSection status={status} loading={loading} onRefresh={refresh} />
                  </SettingTabForm>
                </SettingsWrapper>
              )}
              {current === BackupPageTab.Settings && (
                <SettingsWrapper settings={backupSettings}>
                  <SettingTabForm>
                    <BackupSettingsSection />
                  </SettingTabForm>
                </SettingsWrapper>
              )}
              {current === BackupPageTab.Encryption && (
                <SettingsWrapper settings={encryptionSettings} onSaved={refresh}>
                  <SettingTabForm>
                    <EncryptionSection status={status} />
                  </SettingTabForm>
                </SettingsWrapper>
              )}
              {current === BackupPageTab.Snapshots && (
                <SettingsWrapper settings={snapshotSettings}>
                  <SnapshotSection authorized={!!status?.authorized} onNavigate={setTab} />
                </SettingsWrapper>
              )}
              {current === BackupPageTab.History && (
                <Box sx={{ mt: 3 }}>
                  <BackupHistory />
                </Box>
              )}
            </Box>
          </CSSTransition>
        </SwitchTransition>
      </Container>
    </PageContainer>
  );
};

export default BackupPage;
