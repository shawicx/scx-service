import { Module } from '@nestjs/common';
import { UserRoleService } from './user-role.service';

@Module({
  providers: [UserRoleService],
  exports: [UserRoleService],
})
export class UserRoleModule {}
