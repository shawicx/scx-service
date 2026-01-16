import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';

export class AiProviderConfigDto {
  @ApiPropertyOptional({ description: 'API 密钥' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '自定义端点' })
  @IsOptional()
  @IsString()
  baseUrl?: string;
}

export class UpdateAiConfigDto {
  @ApiPropertyOptional({
    description: '默认平台',
    enum: ['copilot', 'glm', 'qwen'],
  })
  @IsOptional()
  @IsEnum(['copilot', 'glm', 'qwen'])
  defaultProvider?: 'copilot' | 'glm' | 'qwen';

  @ApiPropertyOptional({
    description: '平台配置',
    type: 'object',
    properties: {
      copilot: { type: AiProviderConfigDto },
      glm: { type: AiProviderConfigDto },
      qwen: { type: AiProviderConfigDto },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  providers?: {
    copilot?: AiProviderConfigDto;
    glm?: AiProviderConfigDto;
    qwen?: AiProviderConfigDto;
  };
}
