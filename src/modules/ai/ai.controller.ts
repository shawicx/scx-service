import { Body, Controller, Get, Post, Put, Query, Req } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { CompletionRequestDto } from './dto/ai-request.dto';
import { AiResponse } from './interfaces/ai-provider.interface';
import { User } from '../user/entities/user.entity';
import { SystemException } from '@/common/exceptions';

@ApiTags('AI 服务')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 生成 AI 回复(非流式)
   */
  @Post('completion')
  @ApiOperation({
    summary: '生成 AI 回复',
    description: `使用配置的 AI 平台生成回复，支持显式指定平台或使用默认配置。

    **Provider 选择优先级：**
    1. 请求中显式指定的 provider
    2. 用户默认配置的 provider
    3. 系统默认 provider (配置文件中的 AI_DEFAULT_PROVIDER)

    **特性：**
    - 自动缓存：相同请求会返回缓存结果（可配置）
    - Token 使用统计：记录每次请求的 token 消耗
    - 请求历史：自动保存到数据库用于后续查询
    - 智能错误处理：统一的错误映射和友好的错误信息`,
  })
  @ApiBody({
    type: CompletionRequestDto,
    examples: {
      simple: {
        summary: '简单请求',
        description: '最简单的请求示例',
        value: {
          messages: [{ role: 'user', content: '你好，请介绍一下你自己' }],
        },
      },
      WithOptions: {
        summary: '带参数的请求',
        description: '包含自定义生成参数的请求',
        value: {
          provider: 'copilot',
          messages: [
            { role: 'system', content: '你是一个有帮助的助手' },
            { role: 'user', content: '解释什么是 TypeScript' },
          ],
          options: {
            temperature: 0.7,
            maxTokens: 500,
            topP: 0.9,
          },
        },
      },
      conversation: {
        summary: '多轮对话',
        description: '包含历史对话的多轮交互示例',
        value: {
          messages: [
            { role: 'user', content: '什么是 NestJS?' },
            {
              role: 'assistant',
              content: 'NestJS 是一个用于构建高效、可扩展 Node.js 应用程序的框架。',
            },
            { role: 'user', content: '它有哪些主要特性?' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI 回复成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'AI 生成的回复内容' },
            model: { type: 'string', description: '使用的模型' },
            tokensUsed: {
              type: 'object',
              properties: {
                prompt: { type: 'number', description: '输入 token 数' },
                completion: { type: 'number', description: '输出 token 数' },
                total: { type: 'number', description: '总 token 数' },
              },
            },
            finishReason: { type: 'string', description: '结束原因' },
            provider: { type: 'string', description: '使用的平台' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权或 API 密钥无效' })
  async generateCompletion(
    @Body() dto: CompletionRequestDto,
    @Req() request: FastifyRequest,
  ): Promise<AiResponse> {
    const userPayload = request.user;
    const user = await this.userRepository.findOne({ where: { id: userPayload.userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }
    return this.aiService.generateCompletion(user, dto.messages, dto.options || {}, dto.provider);
  }

  /**
   * 更新用户 AI 配置
   */
  @Put('config')
  @ApiOperation({
    summary: '更新用户 AI 配置',
    description: '更新用户的默认平台和 API 密钥配置',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        defaultProvider: {
          type: 'string',
          enum: ['copilot', 'glm', 'qwen'],
          description: '默认平台',
        },
        providers: {
          type: 'object',
          properties: {
            copilot: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: 'API 密钥' },
                enabled: { type: 'boolean', description: '是否启用' },
                baseUrl: { type: 'string', description: '自定义端点(可选)' },
              },
            },
            glm: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: 'API 密钥' },
                enabled: { type: 'boolean', description: '是否启用' },
                baseUrl: { type: 'string', description: '自定义端点(可选)' },
              },
            },
            qwen: {
              type: 'object',
              properties: {
                apiKey: { type: 'string', description: 'API 密钥' },
                enabled: { type: 'boolean', description: '是否启用' },
                baseUrl: { type: 'string', description: '自定义端点(可选)' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '配置更新成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'AI 配置更新成功' },
      },
    },
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  async updateConfig() // @Body() configDto: any,
  // @Req() request: FastifyRequest,
  : Promise<{ message: string }> {
    // const user = request['user'];
    // TODO: 实现配置更新逻辑(需要 UserService 支持)
    return { message: 'AI 配置更新成功' };
  }

  /**
   * 测试平台连接
   */
  @Post('test-connection')
  @ApiOperation({
    summary: '测试平台连接',
    description: '测试指定平台的 API 连接是否正常',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['provider'],
      properties: {
        provider: {
          type: 'string',
          enum: ['copilot', 'glm', 'qwen'],
          description: '要测试的平台',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '连接测试结果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            provider: { type: 'string', description: '平台名称' },
            connected: { type: 'boolean', description: '是否连接成功' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  async testConnection(
    @Body() dto: { provider: 'copilot' | 'glm' | 'qwen' },
    @Req() request: FastifyRequest,
  ): Promise<{ provider: string; connected: boolean }> {
    const userPayload = request.user;
    const user = await this.userRepository.findOne({ where: { id: userPayload.userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }
    const connected = await this.aiService.testConnection(user, dto.provider);

    return { provider: dto.provider, connected };
  }

  /**
   * 获取可用平台列表
   */
  @Get('providers')
  @Public()
  @ApiOperation({
    summary: '获取可用平台列表',
    description: '获取系统支持的所有 AI 平台列表',
  })
  @ApiResponse({
    status: 200,
    description: '平台列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['copilot', 'glm', 'qwen'] },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  })
  getProviders(): Array<{ type: string; name: string }> {
    return this.aiService.getAvailableProviders();
  }

  /**
   * 获取用户请求历史
   */
  @Get('requests')
  @ApiOperation({
    summary: '获取请求历史',
    description: `分页获取用户的 AI 请求历史记录，包括：
    - 使用的 provider
    - 消息内容
    - Token 使用情况
    - 请求耗时
    - 是否缓存
    - 创建时间

    **分页参数：**
    - page: 页码（从 1 开始，默认 1）
    - limit: 每页数量（默认 20，最大 100）

    **数据排序：**
    按创建时间倒序排列（最新的在前）`,
  })
  @ApiResponse({
    status: 200,
    description: '请求历史列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array', description: '请求记录列表' },
            total: { type: 'number', description: '总记录数' },
            page: { type: 'number', description: '当前页码' },
            limit: { type: 'number', description: '每页记录数' },
          },
        },
      },
    },
  })
  async getRequestHistory(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Req() request: FastifyRequest,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const userPayload = request.user;
    const user = await this.userRepository.findOne({ where: { id: userPayload.userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const { data, total } = await this.aiService.getRequestHistory(user, pageNum, limitNum);

    return { items: data, total, page: pageNum, limit: limitNum };
  }
}
