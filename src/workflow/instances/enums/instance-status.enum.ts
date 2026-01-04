/**
 * 流程实例状态枚举
 */
export enum WorkflowInstanceStatus {
  /** 运行中 */
  RUNNING = 'running',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已暂停 */
  SUSPENDED = 'suspended',
  /** 已终止 */
  TERMINATED = 'terminated',
  /** 错误状态 */
  ERROR = 'error',
  /** 等待中（等待外部事件或条件） */
  WAITING = 'waiting',
}
