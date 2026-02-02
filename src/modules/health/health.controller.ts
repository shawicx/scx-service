import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { HealthService } from './health.service';
import { HealthStatusDto } from './dto/health-response.dto';

@ApiTags('健康检查')
@Controller('health')
@UseInterceptors(ClassSerializerInterceptor)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: '健康检查',
    description: '检查应用状态和依赖（数据库、Redis）连接状态',
  })
  @ApiResponse({
    status: 200,
    description: '健康检查成功',
    type: HealthStatusDto,
  })
  async check(): Promise<any> {
    return this.healthService.checkHealth();
  }
}
