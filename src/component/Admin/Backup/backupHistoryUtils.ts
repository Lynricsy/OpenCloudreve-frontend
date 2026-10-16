import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { i18n as I18n, TFunction } from "i18next";
import { GDriveBackupTrigger } from "../../../api/dashboard";
import type {
  GDriveBackupTaskState,
  GDriveRestoreTaskState,
  GDriveTaskEvent,
  GDriveTaskEventLog,
} from "../../../api/dashboard";
import { TaskStatus } from "../../../api/workflow";
import { sizeToString } from "../../../util";
import { formatDuration } from "../../../util/datetime";

dayjs.extend(duration);

// 运行中的任务在详情对话框中的静默刷新间隔
export const historyPollInterval = 5000;

// 以字节为单位、需要格式化为可读大小的事件参数
const sizeParams: Record<string, true> = { size: true, uploaded_size: true };

// 从机批次相关事件，用于推算从机阶段的结束时间
const remoteEventCodes: Record<string, true> = {
  remote_dispatched: true,
  remote_batch_done: true,
  remote_batch_failed: true,
};

// 解析任务的 private_state，解析失败时返回空对象
export const parseTaskState = <T extends object>(raw?: string): T => {
  if (!raw) {
    return {} as T;
  }
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object" ? parsed : {}) as T;
  } catch {
    return {} as T;
  }
};

export const isTaskActive = (status?: string) =>
  status === TaskStatus.queued || status === TaskStatus.processing || status === TaskStatus.suspending;

export const getTriggerText = (trigger: unknown, t: TFunction) => {
  switch (trigger) {
    case GDriveBackupTrigger.cron:
      return t("backup.triggers.cron");
    case GDriveBackupTrigger.manual:
      return t("backup.triggers.manual");
    default:
      return t("backup.triggers.unknown");
  }
};

// 任务总耗时（创建到最后更新；运行中的任务算到当前时间）。备份会因等待从机而挂起，
// 挂起时间不计入 executed_duration，总耗时更符合管理员对“这次备份用了多久”的直觉。
export const formatWallDuration = (task: { created_at?: string; updated_at?: string; status?: string }) => {
  if (!task.created_at) {
    return "-";
  }
  const end = isTaskActive(task.status) || !task.updated_at ? dayjs() : dayjs(task.updated_at);
  return formatDuration(dayjs.duration(Math.max(0, end.diff(dayjs(task.created_at)))));
};

// 把事件参数转换为插值用的显示值：大小格式化、数组用 ", " 连接、部分枚举值翻译
const formatEventParams = (params: Record<string, unknown> | undefined, t: TFunction) => {
  const res: Record<string, string | number> = {};
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      res[key] = value.join(", ");
    } else if (sizeParams[key]) {
      res[key] = sizeToString(Number(value) || 0);
    } else if (key === "trigger") {
      res[key] = getTriggerText(value, t);
    } else if (key === "encrypted") {
      res[key] = value ? t("backup.encrypted") : t("backup.notEncrypted");
    } else if (key === "target_uid") {
      res[key] = Number(value) > 0 ? t("backup.uid", { uid: value }) : t("backup.restoreToOwner");
    } else if (typeof value === "number") {
      res[key] = value;
    } else if (value === null || value === undefined) {
      res[key] = "";
    } else if (typeof value === "object") {
      res[key] = JSON.stringify(value);
    } else {
      res[key] = String(value);
    }
  });
  return res;
};

// 翻译一条事件；未知 code 显示 code 与原始参数
export const formatEventMessage = (event: GDriveTaskEvent, t: TFunction, i18n: I18n) => {
  const key = `backup.events.${event.c}`;
  if (!event.c || !i18n.exists(key, { ns: "dashboard" })) {
    return `${event.c} ${JSON.stringify(event.p ?? {})}`;
  }
  return t(key, formatEventParams(event.p, t));
};

export interface PhaseSpan {
  // 阶段名称的翻译键
  labelKey: string;
  start: string;
  // 为空表示阶段仍在进行，或任务异常结束且没有终止事件
  end?: string;
  // 任务在该阶段失败
  failed: boolean;
}

interface PhaseMark {
  labelKey: string;
  t: string;
}

const buildSpans = (marks: PhaseMark[], terminal?: GDriveTaskEvent): PhaseSpan[] =>
  marks.map((mark, index) => {
    const isLast = index === marks.length - 1;
    return {
      labelKey: mark.labelKey,
      start: mark.t,
      end: isLast ? terminal?.t : marks[index + 1].t,
      failed: isLast && terminal?.c === "task_failed",
    };
  });

const findEvent = (log: GDriveTaskEventLog, code: string) => log.events?.find((e) => e.c === code);

// 根据事件推算备份任务的阶段时间线：
// started → 扫描；scan_done → 从机（本次有从机实体时）；manifest_started → 生成清单；
// snapshot_uploaded → 清理；finished / task_failed 为结束。
export const getBackupPhaseSpans = (state: GDriveBackupTaskState): PhaseSpan[] => {
  const events = state.events ?? [];
  const started = findEvent(state, "started");
  const scanDone = findEvent(state, "scan_done");
  const manifestStarted = findEvent(state, "manifest_started");
  const uploaded = findEvent(state, "snapshot_uploaded");
  const terminal = events.find((e) => e.c === "finished" || e.c === "task_failed");

  const marks: PhaseMark[] = [];
  if (started) {
    marks.push({ labelKey: "application:setting.gdriveBackupScanning", t: started.t });
  }
  if (scanDone) {
    const scanDoneAt = dayjs(scanDone.t);
    const hasRemote =
      Number(scanDone.p?.remote ?? 0) > 0 ||
      events.some((e) => remoteEventCodes[e.c] && !dayjs(e.t).isBefore(scanDoneAt));
    if (hasRemote) {
      marks.push({ labelKey: "application:setting.gdriveBackupRemote", t: scanDone.t });
    }
  }
  if (manifestStarted) {
    marks.push({ labelKey: "application:setting.gdriveBackupManifest", t: manifestStarted.t });
  }
  if (uploaded) {
    marks.push({ labelKey: "application:setting.gdriveBackupGC", t: uploaded.t });
  }
  return buildSpans(marks, terminal);
};

// 恢复任务的阶段时间线：restore_started → 生成恢复计划；restore_planned → 恢复文件；restore_finished / task_failed 为结束
export const getRestorePhaseSpans = (state: GDriveRestoreTaskState): PhaseSpan[] => {
  const started = findEvent(state, "restore_started");
  const planned = findEvent(state, "restore_planned");
  const terminal = state.events?.find((e) => e.c === "restore_finished" || e.c === "task_failed");

  const marks: PhaseMark[] = [];
  if (started) {
    marks.push({ labelKey: "backup.history.phaseRestorePlan", t: started.t });
  }
  if (planned) {
    marks.push({ labelKey: "application:setting.gdriveRestoring", t: planned.t });
  }
  return buildSpans(marks, terminal);
};
