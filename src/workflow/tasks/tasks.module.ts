import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { WorkflowTask } from '@/workflow/instances/entities/workflow-task.entity';
import { WorkflowInstance } from '@/workflow/instances/entities/workflow-instance.entity';
import { WorkflowDefinition } from '@/workflow/definitions/entities/workflow-definition.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskDelegation } from './entities/task-delegation.entity';
import { User } from '@/modules/user/entities/user.entity';

// Services
import { TaskManagementService } from './services/task-management.service';
import { TaskNotificationService } from './services/task-notification.service';
import { TaskCommentService } from './services/task-comment.service';

// Controllers
import { TaskManagementController } from './controllers/task-management.controller';
import {
  TaskCommentController,
  CommentManagementController,
} from './controllers/task-comment.controller';

// External Dependencies
import { MailModule } from '@/modules/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Core workflow entities
      WorkflowTask,
      WorkflowInstance,
      WorkflowDefinition,

      // Task management specific entities
      TaskComment,
      TaskDelegation,

      // User entities for relations
      User,
    ]),

    // External modules
    MailModule,
  ],

  controllers: [TaskManagementController, TaskCommentController, CommentManagementController],

  providers: [TaskManagementService, TaskNotificationService, TaskCommentService],

  exports: [TaskManagementService, TaskNotificationService, TaskCommentService],
})
export class TasksModule {}
