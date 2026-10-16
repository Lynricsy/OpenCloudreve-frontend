import { UnknownPolicyError } from "../errors";
import Base from "./base";

// 负载均衡策略自身不存储数据：服务端创建上传会话时会返回解析出的子策略，
// Base 据此委托给子策略对应的上传器。只有服务端未完成解析（会话仍返回负载均衡策略）时才会执行到这里。
export default class LoadBalance extends Base {
  public upload = async () => {
    throw new UnknownPolicyError("Load balance policy is not resolved by server.", this.task.policy);
  };
}
