import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class HealthStatusDto {
  @ApiProperty({ description: '服务名称', example: 'scx-service' })
  @IsString()
  service: string;

  @ApiProperty({ description: '服务状态', example: 'ok' })
  @IsString()
  status: string;

  @ApiProperty({ description: '时间戳', example: '2024-01-01T00:00:00.000Z' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: '数据库连接状态' })
  database: { status: string; message?: string };

  @ApiProperty({ description: 'Redis 连接状态' })
  redis: { status: string; message?: string };

  @ApiProperty({ description: '系统信息' })
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}
