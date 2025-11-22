import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/types/user.interface';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: IUser) {
    const { _id, role } = payload;

    // Kiểm tra user trong DB
    const user = await this.usersService.findById(_id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    //Kiểm tra trạng thái tài khoản
    if (user.isActive === false) {
      throw new ForbiddenException({
        message: 'Account is not active',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Gán quyền (nếu là ADMIN)
    let permissions: { method: string; apiPath: string }[] = [];
    if (role === 'ADMIN') {
      permissions = [
        { method: 'GET', apiPath: '/users' },
        { method: 'POST', apiPath: '/users' },
        { method: 'PATCH', apiPath: '/users/:id' },
        { method: 'DELETE', apiPath: '/users/:id' },
      ];
    }

    // Gán req.user
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
      branchId: user.branchId,
    };
  }
}
