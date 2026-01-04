import { Module } from '@nestjs/common';
import { DefinitionsModule } from './definitions/definitions.module';
import { InstancesModule } from './instances/instances.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    DefinitionsModule,
    InstancesModule,
    TasksModule,
    // 后续会添加其他子模块：
    // ComponentsModule,
    // ConnectorsModule,
    // MonitoringModule,
  ],
  exports: [DefinitionsModule, InstancesModule, TasksModule],
})
export class WorkflowModule {}
