import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CacheConfigModule } from '../cache/cache.module';
import { MailModule } from '../mail/mail.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [CacheConfigModule, MailModule, AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
