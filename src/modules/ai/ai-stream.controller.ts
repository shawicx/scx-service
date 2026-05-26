import { Body, Controller, Req, Sse } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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

@ApiTags('AI 服务(流式)')
@Controller('ai')
@ApiBearerAuth()
export class AiStreamController {
  constructor(private readonly aiService: AiService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'AI 对话(流式)' })
  @ApiResponse({ status: 200, description: '流式响应' })
  @ApiBadRequestResponse({ description: '参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权' })
  async streamCompletion(
    @Body() completionDto: CompletionRequestDto,
    @Req() req: FastifyRequest,
  ): Promise<AiResponse> {
    const { user } = req as any;

    if (!user) {
      throw SystemException.invalidCredentials('用户未登录');
    }

    return this.aiService.generateCompletionStream(
      user,
      completionDto.messages,
      {
        temperature: completionDto.options?.temperature,
        maxTokens: completionDto.options?.maxTokens,
        topP: completionDto.options?.topP,
        stream: true,
      },
      completionDto.provider,
    ) as any;
  }
}
