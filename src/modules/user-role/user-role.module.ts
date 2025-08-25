import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../role/entities/role.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRoleService } from './user-role.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, User, Role])],
  providers: [UserRoleService],
  exports: [UserRoleService],
})
export class UserRoleModule {}
