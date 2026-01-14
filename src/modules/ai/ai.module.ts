import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheConfigModule } from '@/modules/cache/cache.module';
import { UserModule } from '@/modules/user/user.module';
import { AiController } from './ai.controller';
import { AiStreamController } from './ai-stream.controller';
import { AiService } from './ai.service';
import { AiRequestEntity } from './entities/ai-request.entity';
import { providerFactory } from './providers/provider.factory';
import { aiConfig } from '@/config/ai.config';

@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    TypeOrmModule.forFeature([AiRequestEntity]),
    CacheConfigModule,
    UserModule,
  ],
  controllers: [AiController, AiStreamController],
  providers: [providerFactory, AiService],
  exports: [AiService],
})
export class AiModule {}
