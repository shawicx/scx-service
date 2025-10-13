import { Module } from '@nestjs/common';
import { DefinitionsModule } from './definitions/definitions.module';

@Module({
  imports: [
    DefinitionsModule,
    // 后续会添加其他子模块：
    // InstancesModule,
    // TasksModule,
    // ComponentsModule,
    // ConnectorsModule,
    // MonitoringModule,
  ],
  exports: [DefinitionsModule],
})
export class WorkflowModule {}
