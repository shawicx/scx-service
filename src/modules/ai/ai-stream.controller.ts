import { Body, Controller, Req, Sse } from '@nestjs/common';
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
import { Observable, map } from 'rxjs';
import { AiService } from './ai.service';
import { CompletionRequestDto } from './dto/ai-request.dto';
import { AiResponse } from './interfaces/ai-provider.interface';

@ApiTags('AI 服务(流式)')
@Controller('ai')
@ApiBearerAuth()
export class AiStreamController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 流式生成 AI 回复(SSE)
   */
  @Sse('completion/stream')
  @ApiOperation({
    summary: '流式生成 AI 回复',
    description: `使用 Server-Sent Events (SSE) 实时流式返回 AI 生成的内容
    返回格式为 SSE 事件流,每个事件包含 AI 生成的部分内容。

    客户端需要处理 SSE 事件流:
    - Event: message - 包含部分生成内容
    - Event: error - 包含错误信息
    - 完成后自动断开连接`,
  })
  @ApiBody({ type: CompletionRequestDto })
  @ApiResponse({
    status: 200,
    description: 'SSE 流式响应',
    content: {
      'text/event-stream': {
        schema: {
          type: 'object',
          example:
            'data: {"content":"Hello","provider":"copilot"}\n\ndata: {"content":" World","provider":"copilot"}',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: '请求参数错误' })
  @ApiUnauthorizedResponse({ description: '未授权或 API 密钥无效' })
  generateCompletionStream(
    @Body() dto: CompletionRequestDto,
    @Req() request: FastifyRequest,
  ): Observable<{ data: AiResponse }> {
    const { user } = request;

    return this.aiService
      .generateCompletionStream(user, dto.messages, dto.options || {}, dto.provider)
      .pipe(map((response) => ({ data: response })));
  }
}
