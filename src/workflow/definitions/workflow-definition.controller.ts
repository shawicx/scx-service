import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowDefinitionQueryDto } from './dto/workflow-definition-query.dto';
import {
  WorkflowDefinitionResponseDto,
  PaginatedWorkflowDefinitionResponseDto,
} from './dto/workflow-definition-response.dto';

@ApiTags('流程定义管理')
@ApiBearerAuth()
@Controller('workflow/definitions')
@UseGuards(AuthGuard)
export class WorkflowDefinitionController {
  constructor(private readonly workflowDefinitionService: WorkflowDefinitionService) {}

  @Post()
  @ApiOperation({ summary: '创建流程定义' })
  @ApiResponse({
    status: 201,
    description: '流程定义创建成功',
    type: WorkflowDefinitionResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '流程定义名称已存在' })
  async create(
    @Body() createWorkflowDefinitionDto: CreateWorkflowDefinitionDto,
    @Request() req: any,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowDefinitionService.create(createWorkflowDefinitionDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取流程定义列表' })
  @ApiResponse({
    status: 200,
    description: '流程定义列表获取成功',
    type: PaginatedWorkflowDefinitionResponseDto,
  })
  async findAll(
    @Query() query: WorkflowDefinitionQueryDto,
  ): Promise<PaginatedWorkflowDefinitionResponseDto> {
    return this.workflowDefinitionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取流程定义详情' })
  @ApiParam({ name: 'id', description: '流程定义ID' })
  @ApiResponse({
    status: 200,
    description: '流程定义详情获取成功',
    type: WorkflowDefinitionResponseDto,
  })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  async findOne(@Param('id') id: string): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowDefinitionService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新流程定义' })
  @ApiParam({ name: 'id', description: '流程定义ID' })
  @ApiResponse({
    status: 200,
    description: '流程定义更新成功',
    type: WorkflowDefinitionResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误或已发布的流程定义不能编辑' })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  @ApiResponse({ status: 409, description: '流程定义名称已存在' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkflowDefinitionDto: UpdateWorkflowDefinitionDto,
    @Request() req: any,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowDefinitionService.update(id, updateWorkflowDefinitionDto, req.user.id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布流程定义' })
  @ApiParam({ name: 'id', description: '流程定义ID' })
  @ApiResponse({
    status: 200,
    description: '流程定义发布成功',
    type: WorkflowDefinitionResponseDto,
  })
  @ApiResponse({ status: 400, description: '流程定义格式错误或状态不允许发布' })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  async publish(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowDefinitionService.publish(id, req.user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档流程定义' })
  @ApiParam({ name: 'id', description: '流程定义ID' })
  @ApiResponse({
    status: 200,
    description: '流程定义归档成功',
    type: WorkflowDefinitionResponseDto,
  })
  @ApiResponse({ status: 400, description: '流程定义已经是归档状态' })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  async archive(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowDefinitionService.archive(id, req.user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取流程定义版本历史' })
  @ApiParam({ name: 'id', description: '流程定义ID' })
  @ApiResponse({
    status: 200,
    description: '版本历史获取成功',
    type: [WorkflowDefinitionResponseDto],
  })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  async getVersions(@Param('id') id: string): Promise<WorkflowDefinitionResponseDto[]> {
    return this.workflowDefinitionService.getVersions(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除流程定义' })
  @ApiParam({ name: 'id', description: '流程定义ID' })
  @ApiResponse({ status: 200, description: '流程定义删除成功' })
  @ApiResponse({ status: 400, description: '已发布的流程定义不能删除' })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  async remove(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    await this.workflowDefinitionService.remove(id, req.user.id);
    return { message: '流程定义删除成功' };
  }
}
