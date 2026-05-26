import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheConfigModule } from '@/modules/cache/cache.module';
import { UserModule } from '@/modules/user/user.module';
import { AiController } from './ai.controller';
import { AiStreamController } from './ai-stream.controller';
import { AiService } from './ai.service';
import { providerFactory } from './providers/provider.factory';
import { aiConfig } from '@/config/ai.config';

@Module({
  imports: [ConfigModule.forFeature(aiConfig), CacheConfigModule, UserModule],
  controllers: [AiController, AiStreamController],
  providers: [providerFactory, AiService],
  exports: [AiService],
})
export class AiModule {}
