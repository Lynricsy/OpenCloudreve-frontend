import { EncryptionCipher, EntityType, PaginationResults, PolicyType } from "./explorer.ts";
import { Capacity } from "./user.ts";
import { TaskStatus, TaskSummary, TaskType } from "./workflow.ts";

export interface MetricsSummary {
  dates: string[];
  files: number[];
  users: number[];
  shares: number[];
  file_total: number;
  user_total: number;
  share_total: number;
  entities_total: number;
  generated_at: string;
}

export interface Version {
  version: string;
  commit: string;
}

export interface HomepageSummary {
  metrics_summary?: MetricsSummary;
  site_urls: string[];
  version: Version;
}

export interface GetSettingService {
  keys: string[];
}

export interface SetSettingService {
  settings: {
    [key: string]: string;
  };
}

export interface GroupEnt extends CommonMixin {
  name: string;
  max_storage?: number;
  speed_limit?: number;
  permissions?: string;
  edges: {
    storage_policies?: StoragePolicy;
  };
  total_users?: number;
  settings?: GroupSetting;
}

export interface GroupSetting {
  compress_size?: number;
  decompress_size?: number;
  remote_download_options?: Record<string, any>;
  source_batch?: number;
  aria2_batch?: number;
  max_walked_files?: number;
  trash_retention?: number;
  redirected_source?: boolean;
  available_policies?: number[];
  allowed_nodes?: number[];
  default_pinned?: DefaultPinnedShare[];
}

export interface DefaultPinnedShare {
  share_id: number;
  name: string;
}

export interface AdminListGroupResponse {
  groups: GroupEnt[];
  pagination: PaginationResults;
}

export interface FetchWOPIDiscoveryService {
  endpoint: string;
}

export interface ThumbGeneratorTestService {
  name: string;
  executable: string;
}

export interface TestSMTPService {
  to: string;
  settings: {
    [key: string]: string;
  };
}

export enum QueueType {
  IO_INTENSE = "io_intense",
  MEDIA_META = "media_meta",
  RECYCLE = "recycle",
  THUMB = "thumb",
  REMOTE_DOWNLOAD = "remote_download",
}

export interface QueueMetric {
  name: QueueType;
  busy_workers: number;
  success_tasks: number;
  failure_tasks: number;
  submitted_tasks: number;
  suspending_tasks: number;
}

export interface CommonMixin {
  id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface StoragePolicy extends CommonMixin {
  name: string;
  type: PolicyType;
  server?: string;
  bucket_name?: string;
  is_private?: boolean;
  access_key?: string;
  secret_key?: string;
  max_size?: number;
  auto_rename?: boolean;
  dir_name_rule?: string;
  file_name_rule?: string;
  settings?: PolicySetting;
  node_id?: number;
  edges: {
    users?: User[];
    groups?: GroupEnt[];
    node?: Node;
  };
  entities_count?: number;
  entities_size?: number;
  hash_id?: string;
}

export enum NodeType {
  master = "master",
  slave = "slave",
}

export interface ListNodeResponse {
  nodes: Node[];
  pagination: PaginationResults;
}

export interface Node extends CommonMixin {
  name?: string;
  status?: NodeStatus;
  type?: NodeType;
  server?: string;
  slave_key?: string;
  capabilities?: string;
  weight?: number;
  settings?: NodeSetting;
  edges: {
    storage_policy?: StoragePolicy[];
  };
}

export enum DownloaderProvider {
  qbittorrent = "qbittorrent",
  aria2 = "aria2",
}

export interface QBittorrentSetting {
  server?: string;
  user?: string;
  password?: string;
  options?: Record<string, string>;
  temp_path?: string;
}

export interface Aria2Setting {
  server?: string;
  token?: string;
  options?: Record<string, string>;
  temp_path?: string;
}

export interface URLValidationSetting {
  disabled?: boolean;
  allowed_hosts?: string[];
  allowed_cidrs?: string[];
}

export interface NodeSetting {
  provider?: DownloaderProvider;
  qbittorrent?: QBittorrentSetting;
  aria2?: Aria2Setting;
  interval?: number;
  wait_for_seeding?: boolean;
  url_validation?: URLValidationSetting;
}

export enum NodeStatus {
  active = "active",
  suspended = "suspended",
}

export interface PolicySetting {
  token?: string;
  file_type?: string[];
  is_file_type_deny_list?: boolean;
  file_regexp?: string;
  is_name_regexp_deny_list?: boolean;
  od_redirect?: string;
  custom_proxy?: boolean;
  proxy_server?: string;
  internal_proxy?: boolean;
  od_driver?: string;
  region?: string;
  server_side_endpoint?: string;
  chunk_size?: number;
  tps_limit?: number;
  tps_limit_burst?: number;
  s3_path_style?: boolean;
  thumb_exts?: string[];
  thumb_support_all_exts?: boolean;
  thumb_max_size?: number;
  relay?: boolean;
  pre_allocate?: boolean;
  media_meta_exts?: string[];
  media_meta_generator_proxy?: boolean;
  thumb_generator_proxy?: boolean;
  native_media_processing?: boolean;
  s3_delete_batch_size?: number;
  stream_saver?: boolean;
  use_cname?: boolean;
  source_auth?: boolean;
  qiniu_upload_cdn?: boolean;
  chunk_concurrency?: number;
  encryption?: boolean;
  lb_children?: LoadBalanceChild[];
}

export interface LoadBalanceChild {
  id: number;
  weight: number;
}

export interface User extends CommonMixin {
  email: string;
  nick: string;
  password?: string;
  settings?: UserSetting;
  status?: UserStatus;
  storage?: number;
  avatar?: string;
  group_users?: number;
  unmanaged_email?: boolean;
  edges: {
    group?: GroupEnt;
    storage_policy?: StoragePolicy;
    passkey?: Passkey[];
  };

  hash_id?: string;
  two_fa_enabled?: boolean;
  capacity?: Capacity;
}

export interface Passkey extends CommonMixin {
  name?: string;
}

export enum UserStatus {
  active = "active",
  inactive = "inactive",
  manual_banned = "manual_banned",
  sys_banned = "sys_banned",
}

export interface UserSetting {
  profile_off?: boolean;
  preferred_policy?: number;
  preferred_theme?: string;
  version_retention?: boolean;
  version_retention_ext?: string[];
  version_retention_max?: number;
  pined?: PinedFile[];
  language?: string;
}

export interface PinedFile {
  uri: string;
  name?: string;
}

export interface ListStoragePolicyResponse {
  policies: StoragePolicy[];
  pagination: PaginationResults;
}

export interface AdminListService {
  page: number;
  page_size: number;
  order_by: string;
  order_direction: string;
  conditions?: Record<string, string>;
  searches?: Record<string, string>;
}

export interface UpsertStoragePolicyService {
  policy: StoragePolicy;
}

export interface CreateStoragePolicyCorsService {
  policy: StoragePolicy;
}

export interface OauthCredentialStatus {
  last_refresh_time: string;
  valid: boolean;
}

export interface GetOauthRedirectService {
  id: number;
  secret: string;
  app_id: string;
}

export interface FinishOauthCallbackService {
  code: string;
  state: string;
}

export interface UpsertGroupService {
  group: GroupEnt;
}

export interface TestNodeService {
  node: Node;
}

export interface TestNodeDownloaderService extends TestNodeService {}

export interface UpsertNodeService extends TestNodeService {}

export interface ListUserResponse {
  users: User[];
  pagination: PaginationResults;
}

export interface UpsertUserService {
  user: User;
  password?: string;
  two_fa?: string;
}

export interface BatchIDService {
  ids: number[];
  force?: boolean;
}

/*
FilePermissions struct {
		Groups map[int]*boolset.BooleanSet `json:"groups,omitempty"`
		Users  map[int]*boolset.BooleanSet `json:"users,omitempty"`
	}

*/

export interface File extends CommonMixin {
  type?: number;
  name?: string;
  owner_id?: number;
  size?: number;
  primary_entity?: number;
  file_children?: number;
  is_symbolic?: boolean;
  storage_policy_files?: number;
  edges: {
    owner?: User;
    storage_policies?: StoragePolicy;
    metadata?: Metadata[];
    entities?: Entity[];
    direct_links?: DirectLink[];
    shares?: Share[];
  };

  user_hash_id?: string;
  file_hash_id?: string;
  direct_link_map?: Record<number, string>;
}

export interface DirectLink extends CommonMixin {
  name?: string;
  downloads?: number;
  speed?: number;
}

export interface Entity extends CommonMixin {
  type?: EntityType;
  source?: string;
  size?: number;
  reference_count?: number;
  storage_policy_entities?: number;
  upload_session_id?: string;
  edges: {
    user?: User;
    storage_policy?: StoragePolicy;
    file?: File[];
  };
  props?: EntityProps;

  user_hash_id?: string;
  user_hash_id_map?: Record<number, string>;
}

export interface EntityProps {
  encrypt_metadata?: EncryptMetadata;
}

export interface EncryptMetadata {
  algorithm: EncryptionCipher;
}

export interface Metadata extends CommonMixin {
  name?: string;
  value?: string;
  is_public?: boolean;
}

export interface ListFileResponse {
  files: File[];
  pagination: PaginationResults;
}

export interface UpsertFileService {
  file: File;
}

export interface ListEntityResponse {
  entities: Entity[];
  pagination: PaginationResults;
}

export interface TaskPublicState {
  error?: string;
  error_history?: string[];
  executed_duration?: number;
  retry_count?: number;
  resume_time?: number;
  slave_task_props?: SlaveTaskProps;
}

export interface SlaveTaskProps {
  node_id?: number;
  master_site_url?: string;
  master_site_id?: string;
  master_site_version?: string;
}

export interface Task extends CommonMixin {
  type?: string;
  status?: TaskStatus;
  public_state?: TaskPublicState;
  private_state?: string;
  correlation_id?: string;
  user_tasks?: number;
  edges: {
    user?: User;
  };

  user_hash_id?: string;
  task_hash_id?: string;
  summary?: TaskSummary;
  node?: Node;
}

export interface ListTaskResponse {
  tasks: Task[];
  pagination: PaginationResults;
}

export interface Share extends CommonMixin {
  password?: string;
  views?: number;
  downloads?: number;
  expires?: string;
  remain_downloads?: number;
  edges: {
    user?: User;
    file?: File;
  };

  user_hash_id?: string;
  share_link?: string;
}

export interface ListShareResponse {
  shares: Share[];
  pagination: PaginationResults;
}

export interface CleanupTaskService {
  not_after: string;
  types?: TaskType[];
  status?: TaskStatus[];
}

export interface OAuthClientProps {
  icon?: string;
  refresh_token_ttl?: number;
}

export interface OAuthClient extends CommonMixin {
  guid?: string;
  secret?: string;
  name?: string;
  homepage_url?: string; // Not used
  redirect_uris?: string[];
  scopes?: string[];
  props?: OAuthClientProps;
  is_enabled?: boolean;
}

export interface GetOAuthClientResponse extends OAuthClient {
  is_system?: boolean;
  total_grants?: number;
}

export interface ListOAuthClientResponse {
  clients: GetOAuthClientResponse[];
  pagination: PaginationResults;
}

export interface UpsertOAuthClientService {
  client: OAuthClient;
}

// Google Drive 备份：单次备份任务的统计摘要
export interface BackupSummary {
  files: number;
  size: number;
  uploaded: number;
  uploaded_size: number;
  reused: number;
  pending: number;
  failed: number;
  deleted_snapshots: number;
  deleted_blobs: number;
  errors?: string[];
  // 备份完成后生成的快照名
  snapshot?: string;
  trigger?: GDriveBackupTrigger;
}

export interface BackupLastTask {
  status: string;
  created_at: string;
  updated_at: string;
  error?: string;
  summary: BackupSummary;
}

export interface BackupStatus {
  redirect_uri: string;
  // 是否已保存刷新令牌
  authorized: boolean;
  account?: {
    email: string;
    name: string;
  };
  // limit 为 0 表示无上限
  quota?: {
    limit: number;
    usage: number;
  };
  account_error?: string;
  // 当前加密公钥（age1…），未开启加密时为 "plain"
  key_id: string;
  running: boolean;
  last_task?: BackupLastTask;
}

export const BackupPlainKeyID = "plain";

export interface GenerateBackupKeyResponse {
  key: string;
  key_id: string;
}

export interface BackupSnapshot {
  id: string;
  name: string;
  created_at: string;
  files: number;
  size: number;
  key_id: string;
  // false 表示需要其他密钥才能读取
  readable: boolean;
}

export interface BrowseBackupSnapshotService {
  snapshot_id: string;
  uid?: number;
  path?: string;
}

export interface BackupSnapshotUser {
  uid: number;
  owner: string;
  files: number;
  size: number;
}

export interface BackupSnapshotEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  files: number;
  modified_at?: string;
}

export interface BrowseBackupSnapshotResponse {
  users?: BackupSnapshotUser[];
  entries?: BackupSnapshotEntry[];
}

export interface BackupRestoreItem {
  uid: number;
  path: string;
}

export interface RestoreBackupService {
  snapshot_id: string;
  items: BackupRestoreItem[];
  // 省略或 0 表示恢复到各自原所有者
  target_uid?: number;
  target_dir: string;
}

// Google Drive 备份/恢复任务事件日志中的一条，消息按 code 翻译（backup.events.<code>）
export interface GDriveTaskEvent {
  // 发生时间（RFC3339）
  t: string;
  l: GDriveTaskEventLevel;
  c: string;
  // 参数名为 snake_case；size 类参数单位为字节
  p?: Record<string, unknown>;
}

export type GDriveTaskEventLevel = "info" | "warning" | "error";

// 备份任务的触发方式，旧任务没有该字段
export enum GDriveBackupTrigger {
  cron = "cron",
  manual = "manual",
}

export enum GDriveBackupPhase {
  scan = "scan",
  remote = "remote",
  manifest = "manifest",
  gc = "gc",
  finish = "finish",
}

// 已派发给从机、尚未完成的一批，覆盖队列文件 [done, end)
export interface GDriveRemoteBatch {
  slave_task_id: number;
  end: number;
  poll_errors?: number;
}

// 某个从机的待处理队列进度，written/done 为队列文件的字节偏移
export interface GDriveRemoteNode {
  // 写入该节点队列的实体数
  queued?: number;
  written: number;
  done: number;
  attempts?: number;
  inflight?: GDriveRemoteBatch;
}

export interface GDriveBackupStats {
  processed: number;
  files: number;
  size: number;
  uploaded: number;
  uploaded_size: number;
  reused: number;
  pending: number;
  failed: number;
  deleted_snapshots: number;
  deleted_blobs: number;
  snapshot?: string;
}

// 备份与恢复任务共有的事件日志字段
export interface GDriveTaskEventLog {
  events?: GDriveTaskEvent[];
  // 超出保留上限后被丢弃的最旧事件数
  events_dropped?: number;
}

// 备份任务的 private_state
export interface GDriveBackupTaskState extends GDriveTaskEventLog {
  phase?: string;
  started_at?: string;
  // "plain" 表示不加密
  key_id?: string;
  policies?: number[];
  // 键为从机节点 ID
  remote?: Record<string, GDriveRemoteNode>;
  stats?: GDriveBackupStats;
  // 失败文件，格式为 "[所有者] 路径: 原因"
  errors?: string[];
  trigger?: string;
}

// 恢复任务的 private_state
export interface GDriveRestoreTaskState extends GDriveTaskEventLog {
  snapshot_id?: string;
  snapshot_name?: string;
  items?: BackupRestoreItem[];
  // 为空或 0 表示恢复到各自原所有者
  target_uid?: number;
  target_dir?: string;
  phase?: string;
  total?: number;
  done?: number;
  restored?: number;
  skipped?: number;
  failed?: number;
  errors?: string[];
}
