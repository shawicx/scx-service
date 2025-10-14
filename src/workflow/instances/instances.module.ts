import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowTask } from './entities/workflow-task.entity';
import { WorkflowDefinition } from '../definitions/entities/workflow-definition.entity';

// Services
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowTaskService } from './workflow-task.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { TaskEngineService } from './services/task-engine.service';
import { NodeExecutorService } from './services/node-executor.service';

// Controllers
import { WorkflowInstanceController } from './workflow-instance.controller';
import { WorkflowTaskController } from './workflow-task.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowInstance, WorkflowTask, WorkflowDefinition])],
  controllers: [WorkflowInstanceController, WorkflowTaskController],
  providers: [
    WorkflowInstanceService,
    WorkflowTaskService,
    WorkflowEngineService,
    TaskEngineService,
    NodeExecutorService,
  ],
  exports: [WorkflowInstanceService, WorkflowTaskService, WorkflowEngineService, TaskEngineService],
})
export class InstancesModule {}
