import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const currentUserId = request.user?.userId;

    if (!currentUserId) {
      throw new UnauthorizedException('未找到用户信息');
    }

    const isAdmin = await this.userService.isAdmin(currentUserId);

    if (!isAdmin) {
      throw new UnauthorizedException('需要管理员权限');
    }

    return true;
  }
}
