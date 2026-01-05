import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiProviderType } from '../interfaces/ai-provider.interface';

export class AiMessageDto {
  @ApiProperty({ description: '消息角色', enum: ['system', 'user', 'assistant'] })
  @IsString()
  @IsEnum(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @ApiProperty({ description: '消息内容' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AiRequestOptionsDto {
  @ApiPropertyOptional({
    description: '温度(0-2)，控制随机性',
    default: 0.7,
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    description: '最大生成的token数',
    default: 2048,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Top P采样(0-1)',
    default: 1.0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;
}

export class CompletionRequestDto {
  @ApiProperty({
    description: '消息列表',
    type: [AiMessageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiMessageDto)
  messages: AiMessageDto[];

  @ApiPropertyOptional({
    description: '生成选项',
    type: AiRequestOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiRequestOptionsDto)
  options?: AiRequestOptionsDto;

  @ApiPropertyOptional({
    description: '显式指定平台',
    enum: ['copilot', 'glm', 'qwen'],
  })
  @IsOptional()
  @IsString()
  provider?: AiProviderType;
}
