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
import { SystemException } from '@/common/exceptions';

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
  @ApiBody({ type: CompletionRequestDto })
  @ApiResponse({ status: 200, description: '成功生成回复', type: Object })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权' })
  async completion(
    @Body() completionDto: CompletionRequestDto,
    @Req() req: FastifyRequest,
  ): Promise<AiResponse> {
    const { user } = req as any;

    if (!user) {
      throw SystemException.invalidCredentials('用户未登录');
    }

    return this.aiService.generateCompletion(
      user,
      completionDto.messages,
      {
        temperature: completionDto.options?.temperature,
        maxTokens: completionDto.options?.maxTokens,
        topP: completionDto.options?.topP,
      },
      completionDto.provider,
    );
  }

  /**
   * 获取用户 AI 配置
   */
  @Get('config')
  @ApiOperation({ summary: '获取用户 AI 配置' })
  @ApiResponse({ status: 200, description: '用户配置' })
  async getConfig(@Req() req: FastifyRequest) {
    const { user } = req as any;
    return user?.preferences?.ai || {};
  }

  /**
   * 更新用户 AI 配置
   */
  @Put('config')
  @ApiOperation({ summary: '更新用户 AI 配置' })
  @ApiBody({
    schema: {
      example: {
        defaultProvider: 'copilot',
        providers: { copilot: { apiKey: 'xxx', enabled: true } },
      },
    },
  })
  @ApiResponse({ status: 200, description: '配置已更新' })
  async updateConfig(@Body() config: any, @Req() req: FastifyRequest) {
    const { user } = req as any;
    await this.aiService.updateUserConfig(user, config);
    return { success: true };
  }

  /**
   * 获取可用的 AI 平台列表
   */
  @Get('providers')
  @ApiOperation({ summary: '获取可用的 AI 平台列表' })
  @ApiResponse({ status: 200, description: '平台列表' })
  getProviders() {
    return this.aiService.getAvailableProviders();
  }

  /**
   * 测试 AI 平台连接
   */
  @Post('test-connection')
  @ApiOperation({ summary: '测试 AI 平台连接' })
  @ApiBody({ schema: { example: { provider: 'copilot' } } })
  @ApiResponse({ status: 200, description: '连接测试结果' })
  async testConnection(@Body('provider') provider: string, @Req() req: FastifyRequest) {
    const { user } = req as any;
    return await this.aiService.testConnection(user, provider as any);
  }

  /**
   * 获取用户的请求历史
   */
  @Get('history')
  @ApiOperation({ summary: '获取用户的 AI 请求历史' })
  @ApiResponse({ status: 200, description: '请求历史' })
  async getHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: FastifyRequest,
  ) {
    const { user } = req as any;
    return await this.aiService.getRequestHistory(user, Number(page), Number(limit));
  }
}
