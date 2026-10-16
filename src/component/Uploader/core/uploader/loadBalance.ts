import { PolicyType } from "../../../../api/explorer.ts";
import { UnknownPolicyError } from "../errors";
import UploadManager from "../index";
import { Task } from "../types";
import Base from "./base";

// 负载均衡上传器：服务端在创建上传会话时把负载均衡策略解析为某个子策略，
// 本上传器据此把实际传输委托给子策略对应的上传器（共享同一个 task）。
export default class LoadBalance extends Base {
  private inner?: Base;

  constructor(task: Task, manager: UploadManager) {
    super(task, manager);
    this.task.lbPolicy = this.task.lbPolicy ?? task.policy;
  }

  protected beforeSession() {
    // 重试时恢复为负载均衡策略，由服务端重新解析子策略
    this.inner = undefined;
    if (this.task.lbPolicy) {
      this.task.policy = this.task.lbPolicy;
    }
  }

  protected afterSession() {
    const resolved = this.task.session?.storage_policy;
    if (!resolved || resolved.type == PolicyType.load_balance) {
      throw new UnknownPolicyError("Load balance policy is not resolved by server.", resolved ?? this.task.policy);
    }

    this.logger.info("Load balance policy resolved to:", resolved);
    this.task.policy = resolved;
  }

  public upload = async () => {
    const inner = this.manager.dispatchUploader(this.task);
    if (inner instanceof LoadBalance) {
      throw new UnknownPolicyError("Load balance policy is not resolved by server.", this.task.policy);
    }

    inner.subscribe({
      onTransition: (status) => {
        this.status = status;
        this.subscriber.onTransition(status);
      },
      onError: (err) => this.subscriber.onError(err),
      onProgress: (data) => {
        this.progress = data;
        this.subscriber.onProgress(data);
      },
      onMsg: (msg, color) => this.subscriber.onMsg(msg, color),
    });
    this.inner = inner;
    await inner.upload();
  };

  public async afterUpload(): Promise<any> {
    return this.inner?.afterUpload();
  }

  public abortRequests() {
    this.inner?.abortRequests();
    super.abortRequests();
  }
}
