import { Body, Controller, Get, Post, Put, Query, Req } from '@nestjs/common';
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
import { AiService } from './ai.service';
import { CompletionRequestDto } from './dto/ai-request.dto';
import { AiResponse } from './interfaces/ai-provider.interface';

@ApiTags('AI 服务')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 生成 AI 回复(非流式)
   */
  @Post('completion')
  @ApiOperation({
    summary: '生成 AI 回复',
    description: '使用配置的 AI 平台生成回复,支持显式指定平台或使用默认配置',
  })
  @ApiBody({ type: CompletionRequestDto })
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
  ): Promise<{ success: boolean; data: AiResponse }> {
    const { user } = request;
    const response = await this.aiService.generateCompletion(
      user,
      dto.messages,
      dto.options || {},
      dto.provider,
    );

    return { success: true, data: response };
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
  : Promise<{ success: boolean; message: string }> {
    // const user = request['user'];
    // TODO: 实现配置更新逻辑(需要 UserService 支持)
    return { success: true, message: 'AI 配置更新成功' };
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
  ): Promise<{ success: boolean; data: { provider: string; connected: boolean } }> {
    const { user } = request;
    const connected = await this.aiService.testConnection(user, dto.provider);

    return { success: true, data: { provider: dto.provider, connected } };
  }

  /**
   * 获取可用平台列表
   */
  @Get('providers')
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
  getProviders(): {
    success: boolean;
    data: Array<{ type: string; name: string }>;
  } {
    const providers = this.aiService.getAvailableProviders();
    return { success: true, data: providers };
  }

  /**
   * 获取用户请求历史
   */
  @Get('requests')
  @ApiOperation({
    summary: '获取请求历史',
    description: '分页获取用户的 AI 请求历史记录',
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
  ): Promise<{
    success: boolean;
    data: { items: any[]; total: number; page: number; limit: number };
  }> {
    const { user } = request;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const { data, total } = await this.aiService.getRequestHistory(user, pageNum, limitNum);

    return {
      success: true,
      data: { items: data, total, page: pageNum, limit: limitNum },
    };
  }
}
