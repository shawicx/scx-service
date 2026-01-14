import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CacheConfigModule } from '../cache/cache.module';
import { MailModule } from '../mail/mail.module';
import { Role } from '../role/entities/role.entity';
import { UserRole } from '../user-role/entities/user-role.entity';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const typeOrmFeature = TypeOrmModule.forFeature([User, Role, UserRole]);

@Module({
  imports: [typeOrmFeature, CacheConfigModule, MailModule, AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, typeOrmFeature],
})
export class UserModule {}
