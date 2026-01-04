import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowDefinitionController } from './workflow-definition.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowDefinition])],
  controllers: [WorkflowDefinitionController],
  providers: [WorkflowDefinitionService],
  exports: [WorkflowDefinitionService],
})
export class DefinitionsModule {}
