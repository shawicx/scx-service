import { Module } from '@nestjs/common';
import { DefinitionsModule } from './definitions/definitions.module';
import { InstancesModule } from './instances/instances.module';

@Module({
  imports: [
    DefinitionsModule,
    InstancesModule,
    // 后续会添加其他子模块：
    // ComponentsModule,
    // ConnectorsModule,
    // MonitoringModule,
  ],
  exports: [DefinitionsModule, InstancesModule],
})
export class WorkflowModule {}
