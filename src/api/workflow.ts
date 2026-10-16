import { PaginationResults } from "./explorer.ts";

export interface ArchiveWorkflowService {
  src: string[];
  dst: string;
  encoding?: string;
  password?: string;
  file_mask?: string[];
  node_id?: string;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  pagination: PaginationResults;
}

export interface TaskResponse {
  created_at: string;
  updated_at: string;
  id: string;
  status: string;
  type: string;
  node?: NodeSummary;
  summary?: TaskSummary;
  error?: string;
  error_history?: string[];
  duration?: number;
  resume_time?: number;
  retry_count?: number;
}

export interface TaskSummary {
  phase?: string;
  props: {
    src?: string;
    src_str?: string;
    dst?: string;
    src_multiple?: string[];
    dst_policy_id?: string;
    failed?: number;
    total?: number;
    // 存储策略转移：已转移/跳过的实体数
    relocated?: number;
    skipped?: number;
    download?: DownloadTaskStatus;
    // Google Drive 备份/恢复：快照名
    snapshot?: string;
    // Google Drive 备份统计
    files?: number;
    size?: number;
    uploaded?: number;
    uploaded_size?: number;
    reused?: number;
    pending?: number;
    deleted_snapshots?: number;
    deleted_blobs?: number;
    // Google Drive 备份触发方式：cron | manual，旧任务没有
    trigger?: string;
    // Google Drive 恢复：已恢复文件数
    restored?: number;
  };
}

export enum DownloadTaskState {
  seeding = "seeding",
  downloading = "downloading",
  error = "error",
  completed = "completed",
  unknown = "unknown",
}

export interface DownloadTaskStatus {
  name: string;
  state: DownloadTaskState;
  total: number;
  downloaded: number;
  download_speed: number;
  upload_speed: number;
  uploaded: number;
  files?: DownloadTaskFile[];
  hash?: string;
  pieces?: string;
  num_pieces?: number;
}

export interface DownloadTaskFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  selected: boolean;
}

export interface NodeSummary {
  id: string;
  name: string;
  type: NodeTypes;
  capabilities: string;
}

export enum NodeTypes {
  master = "master",
  slave = "slave",
}

export const NodeCapability = {
  none: 0,
  create_archive: 1,
  extract_archive: 2,
  remote_download: 3,
  //relocate: 4,
};

export interface RelocateWorkflowService {
  src: string[];
  dst_policy_id: string;
}

export interface DownloadWorkflowService {
  src?: string[];
  src_file?: string;
  dst: string;
  node_id?: string;
}

export interface ImportWorkflowService {
  src: string;
  dst: string;
  extract_media_meta?: boolean;
  user_id: string;
  recursive?: boolean;
  policy_id: number;
}

export interface ListTaskService {
  page_size: number;
  category: ListTaskCategory;
  next_page_token?: string;
}

export enum ListTaskCategory {
  general = "general",
  downloading = "downloading",
  downloaded = "downloaded",
}

export enum TaskType {
  create_archive = "create_archive",
  extract_archive = "extract_archive",
  remote_download = "remote_download",
  relocate = "relocate",
  media_metadata = "media_meta",
  entity_recycle_routine = "entity_recycle_routine",
  explicit_entity_recycle = "explicit_entity_recycle",
  upload_sentinel_check = "upload_sentinel_check",
  import = "import",
  full_text_index = "full_text_index",
  full_text_copy = "full_text_copy",
  full_text_change_owner = "full_text_change_owner",
  full_text_delete = "full_text_delete",
  full_text_rebuild = "full_text_rebuild",
  gdrive_backup = "gdrive_backup",
  gdrive_restore = "gdrive_restore",
}

export enum TaskStatus {
  queued = "queued",
  processing = "processing",
  suspending = "suspending",
  error = "error",
  canceled = "canceled",
  completed = "completed",
}

export interface TaskProgress {
  total: number;
  current: number;
  identifier: string;
}

export interface TaskProgresses {
  [key: string]: TaskProgress;
}

export interface SetFileToDownloadArgs {
  index: number;
  download: boolean;
}

export interface SetDownloadFilesService {
  files: SetFileToDownloadArgs[];
}

export interface RebuildFTSIndexWorkflowService {
  filtered_storage_policy?: number[];
}
