import { Module } from '@nestjs/common';
import { CacheConfigModule } from '../cache/cache.module';
import { AuthService } from './auth.service';

@Module({
  imports: [CacheConfigModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
