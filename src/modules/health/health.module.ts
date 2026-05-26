import { Module } from '@nestjs/common';
import { CacheConfigModule } from '../cache/cache.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [CacheConfigModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
