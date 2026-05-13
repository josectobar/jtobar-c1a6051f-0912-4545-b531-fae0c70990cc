import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@taskMgr/auth';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
