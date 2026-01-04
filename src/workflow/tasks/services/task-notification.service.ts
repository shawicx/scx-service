import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTask } from '@/workflow/instances/entities/workflow-task.entity';
import { WorkflowTaskStatus } from '@/workflow/instances/enums/task-status.enum';
import { User } from '@/modules/user/entities/user.entity';
import { MailService } from '@/modules/mail/mail.service';

export interface TaskNotificationData {
  taskId: string;
  taskName: string;
  instanceId: string;
  businessKey?: string;
  assigneeEmail?: string;
  fromUserEmail?: string;
  toUserEmail?: string;
  operatorEmail?: string;
  dueDate?: Date;
  priority: number;
  description?: string;
  instanceUrl: string;
  taskUrl: string;
}

@Injectable()
export class TaskNotificationService {
  private readonly logger = new Logger(TaskNotificationService.name);

  constructor(
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  /**
   * 通知任务已认领
   */
  async notifyTaskClaimed(taskId: string, userId: string): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId, userId);

      if (notificationData.assigneeEmail) {
        await this.mailService.sendMail(
          notificationData.assigneeEmail,
          `任务已认领 - ${notificationData.taskName}`,
          'task-claimed',
          notificationData,
        );

        this.logger.log(`✅ 任务认领通知已发送: ${taskId} -> ${notificationData.assigneeEmail}`);
      }
    } catch (error) {
      this.logger.error(`任务认领通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知任务已完成
   */
  async notifyTaskCompleted(taskId: string, userId: string): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId, userId);

      // 通知流程发起人
      if (notificationData.assigneeEmail) {
        await this.mailService.sendMail(
          notificationData.assigneeEmail,
          `任务已完成 - ${notificationData.taskName}`,
          'task-completed',
          notificationData,
        );
      }

      // 通知下一个处理人（如果有的话）
      await this.notifyNextTaskAssignees(notificationData.instanceId);

      this.logger.log(`✅ 任务完成通知已发送: ${taskId}`);
    } catch (error) {
      this.logger.error(`任务完成通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知任务已委派
   */
  async notifyTaskDelegated(taskId: string, fromUserId: string, toUserId: string): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId);
      const fromUser = await this.userRepository.findOne({ where: { id: fromUserId } });
      const toUser = await this.userRepository.findOne({ where: { id: toUserId } });

      if (!fromUser || !toUser) {
        this.logger.warn(`用户信息不完整，跳过委派通知: ${taskId}`);
        return;
      }

      notificationData.fromUserEmail = fromUser.email;
      notificationData.toUserEmail = toUser.email;

      // 通知新的处理人
      await this.mailService.sendMail(
        toUser.email,
        `任务已委派给您 - ${notificationData.taskName}`,
        'task-delegated-to',
        notificationData,
      );

      // 通知原处理人
      await this.mailService.sendMail(
        fromUser.email,
        `任务委派确认 - ${notificationData.taskName}`,
        'task-delegated-from',
        notificationData,
      );

      this.logger.log(`✅ 任务委派通知已发送: ${taskId} (${fromUser.email} -> ${toUser.email})`);
    } catch (error) {
      this.logger.error(`任务委派通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知任务已重新分配
   */
  async notifyTaskReassigned(
    taskId: string,
    newAssigneeId: string,
    operatorId: string,
  ): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId, newAssigneeId);
      const operator = await this.userRepository.findOne({ where: { id: operatorId } });

      if (!operator) {
        this.logger.warn(`操作者信息不存在，跳过重新分配通知: ${taskId}`);
        return;
      }

      notificationData.operatorEmail = operator.email;

      // 通知新的分配者
      if (notificationData.assigneeEmail) {
        await this.mailService.sendMail(
          notificationData.assigneeEmail,
          `任务已分配给您 - ${notificationData.taskName}`,
          'task-reassigned',
          notificationData,
        );
      }

      this.logger.log(`✅ 任务重新分配通知已发送: ${taskId} -> ${notificationData.assigneeEmail}`);
    } catch (error) {
      this.logger.error(`任务重新分配通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知任务即将到期
   */
  async notifyTaskDueSoon(taskId: string, hoursBeforeDue: number = 24): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId);

      if (!notificationData.dueDate || !notificationData.assigneeEmail) {
        return;
      }

      const now = new Date();
      const timeUntilDue = notificationData.dueDate.getTime() - now.getTime();
      const hoursUntilDue = timeUntilDue / (1000 * 60 * 60);

      if (hoursUntilDue <= hoursBeforeDue && hoursUntilDue > 0) {
        await this.mailService.sendMail(
          notificationData.assigneeEmail,
          `任务即将到期 - ${notificationData.taskName}`,
          'task-due-soon',
          {
            ...notificationData,
            hoursUntilDue: Math.ceil(hoursUntilDue),
          },
        );

        this.logger.log(`✅ 任务到期提醒已发送: ${taskId} -> ${notificationData.assigneeEmail}`);
      }
    } catch (error) {
      this.logger.error(`任务到期提醒发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知任务已逾期
   */
  async notifyTaskOverdue(taskId: string): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId);

      if (!notificationData.assigneeEmail) {
        return;
      }

      await this.mailService.sendMail(
        notificationData.assigneeEmail,
        `任务已逾期 - ${notificationData.taskName}`,
        'task-overdue',
        notificationData,
      );

      this.logger.log(`✅ 任务逾期通知已发送: ${taskId} -> ${notificationData.assigneeEmail}`);
    } catch (error) {
      this.logger.error(`任务逾期通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 批量发送任务到期提醒
   */
  async sendDueReminders(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const dueTasks = await this.taskRepository.find({
        where: {
          dueDate: tomorrow,
          status: WorkflowTaskStatus.IN_PROGRESS,
          isDeleted: false,
        },
      });

      for (const task of dueTasks) {
        await this.notifyTaskDueSoon(task.id, 24);
      }

      this.logger.log(`✅ 批量到期提醒已发送，处理任务数: ${dueTasks.length}`);
    } catch (error) {
      this.logger.error('批量发送到期提醒失败', error.stack);
    }
  }

  /**
   * 批量发送逾期通知
   */
  async sendOverdueNotifications(): Promise<void> {
    try {
      const now = new Date();

      const overdueTasks = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.dueDate < :now', { now })
        .andWhere('task.status IN (:...statuses)', {
          statuses: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
        })
        .andWhere('task.isDeleted = :isDeleted', { isDeleted: false })
        .getMany();

      for (const task of overdueTasks) {
        await this.notifyTaskOverdue(task.id);
      }

      this.logger.log(`✅ 批量逾期通知已发送，处理任务数: ${overdueTasks.length}`);
    } catch (error) {
      this.logger.error('批量发送逾期通知失败', error.stack);
    }
  }

  /**
   * 通知下一个任务的处理人
   */
  private async notifyNextTaskAssignees(instanceId: string): Promise<void> {
    try {
      // 查找该实例下的待处理任务
      const nextTasks = await this.taskRepository.find({
        where: {
          instanceId,
          status: WorkflowTaskStatus.PENDING,
          isDeleted: false,
        },
        relations: ['assignee'],
      });

      for (const task of nextTasks) {
        if (task.assigneeId) {
          await this.notifyTaskAssigned(task.id, task.assigneeId);
        } else {
          // 通知候选用户
          await this.notifyCandidateUsers(task.id);
        }
      }
    } catch (error) {
      this.logger.error(`通知下一个任务处理人失败: ${instanceId}`, error.stack);
    }
  }

  /**
   * 通知任务已分配
   */
  private async notifyTaskAssigned(taskId: string, assigneeId: string): Promise<void> {
    try {
      const notificationData = await this.getTaskNotificationData(taskId, assigneeId);

      if (notificationData.assigneeEmail) {
        await this.mailService.sendMail(
          notificationData.assigneeEmail,
          `新任务分配 - ${notificationData.taskName}`,
          'task-assigned',
          notificationData,
        );

        this.logger.log(`✅ 任务分配通知已发送: ${taskId} -> ${notificationData.assigneeEmail}`);
      }
    } catch (error) {
      this.logger.error(`任务分配通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知候选用户有新任务
   */
  private async notifyCandidateUsers(taskId: string): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['instance'],
      });

      if (!task || task.candidateUsers.length === 0) {
        return;
      }

      const candidateEmails = await this.userRepository
        .createQueryBuilder('user')
        .select('user.email')
        .where('user.id IN (:...ids)', { ids: task.candidateUsers })
        .getMany();

      const notificationData = await this.getTaskNotificationData(taskId);

      for (const user of candidateEmails) {
        await this.mailService.sendMail(
          user.email,
          `候选任务通知 - ${notificationData.taskName}`,
          'task-candidate',
          notificationData,
        );
      }

      this.logger.log(`✅ 候选任务通知已发送: ${taskId} (${candidateEmails.length}个候选用户)`);
    } catch (error) {
      this.logger.error(`候选任务通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知新候选用户
   */
  async notifyNewCandidates(taskId: string, userIds: string[]): Promise<void> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids: userIds })
        .getMany();

      const notificationData = await this.getTaskNotificationData(taskId);

      for (const user of users) {
        await this.mailService.sendMail(
          user.email,
          `新的候选任务 - ${notificationData.taskName}`,
          'task-new-candidate',
          { ...notificationData, assigneeEmail: user.email },
        );
      }

      this.logger.log(`✅ 新候选用户通知已发送: ${taskId} (${users.length}个用户)`);
    } catch (error) {
      this.logger.error(`新候选用户通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 通知任务转移
   */
  async notifyTaskTransferred(taskId: string, toUserId: string, operatorId: string): Promise<void> {
    try {
      const [toUser, operator] = await Promise.all([
        this.userRepository.findOne({ where: { id: toUserId } }),
        this.userRepository.findOne({ where: { id: operatorId } }),
      ]);

      if (!toUser || !operator) {
        this.logger.warn(`用户信息不完整，跳过转移通知: ${taskId}`);
        return;
      }

      const notificationData = await this.getTaskNotificationData(taskId, toUserId);

      // 通知接收者
      await this.mailService.sendMail(
        toUser.email,
        `任务已转移给您 - ${notificationData.taskName}`,
        'task-transferred-to',
        { ...notificationData, operatorEmail: operator.email },
      );

      this.logger.log(`✅ 任务转移通知已发送: ${taskId} -> ${toUser.email}`);
    } catch (error) {
      this.logger.error(`任务转移通知发送失败: ${taskId}`, error.stack);
    }
  }

  /**
   * 获取任务通知数据
   */
  private async getTaskNotificationData(
    taskId: string,
    assigneeId?: string,
  ): Promise<TaskNotificationData> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['instance', 'assignee'],
    });

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    let assigneeEmail: string | undefined;
    if (assigneeId) {
      const assignee = await this.userRepository.findOne({ where: { id: assigneeId } });
      assigneeEmail = assignee?.email;
    } else if (task.assigneeId && (task as any).assignee) {
      assigneeEmail = (task as any).assignee.email;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return {
      taskId: task.id,
      taskName: task.nodeName,
      instanceId: task.instanceId,
      businessKey: (task as any).instance?.businessKey,
      assigneeEmail,
      dueDate: task.dueDate,
      priority: task.priority,
      description: task.description,
      instanceUrl: `${baseUrl}/workflow/instances/${task.instanceId}`,
      taskUrl: `${baseUrl}/workflow/tasks/${task.id}`,
    };
  }
}
