/**
 * 任务状态枚举
 */
export enum WorkflowTaskStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 进行中 */
  IN_PROGRESS = 'in_progress',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已跳过 */
  SKIPPED = 'skipped',
  /** 错误状态 */
  ERROR = 'error',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 已超时 */
  TIMEOUT = 'timeout',
  /** 等待中（等待条件满足） */
  WAITING = 'waiting',
}

/**
 * 任务类型枚举
 */
export enum WorkflowTaskType {
  /** 用户任务 */
  USER_TASK = 'userTask',
  /** 服务任务 */
  SERVICE_TASK = 'serviceTask',
  /** 脚本任务 */
  SCRIPT_TASK = 'scriptTask',
  /** 发送邮件任务 */
  MAIL_TASK = 'mailTask',
  /** 子流程任务 */
  SUB_PROCESS = 'subProcess',
  /** 决策网关 */
  EXCLUSIVE_GATEWAY = 'exclusiveGateway',
  /** 并行网关 */
  PARALLEL_GATEWAY = 'parallelGateway',
  /** 包容网关 */
  INCLUSIVE_GATEWAY = 'inclusiveGateway',
}
