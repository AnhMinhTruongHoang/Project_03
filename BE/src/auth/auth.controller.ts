import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  Res,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { Public, ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { LocalAuthGuard } from './guards/local.auth.guard';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersService } from 'src/modules/users/users.service';
import {
  RegisterUserDto,
  UserLoginDto,
} from 'src/modules/users/dto/create-user.dto';
import { CodeAuthDto } from 'src/modules/users/dto/code-auth.dto';
import { ChangePasswordDto } from 'src/modules/users/dto/change-password.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private mailerService: MailerService,
    private usersService: UsersService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @UseGuards(ThrottlerGuard)
  @ApiBody({ type: UserLoginDto }) // swagger get token
  @Throttle(5, 60)
  @Post('/login')
  @ResponseMessage('User Login')
  handleLogin(@Req() req, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(req.user, response);
  }

  //////////////jwt
  @Public()
  @UseGuards(AuthGuard('jwt'))
  @ResponseMessage('Register a new user')
  @Post('/register')
  handleRegister(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  /// verify mail code
  @Public()
  @ResponseMessage('verify register code')
  @Post('check-code')
  checkCode(@Body() registerUserDto: CodeAuthDto) {
    return this.authService.checkCode(registerUserDto);
  }

  @ResponseMessage('Get user information')
  @Get('/account')
  async handleGetAccount(@Users() user: IUser) {
    const temp = (await this.usersService.findOne(user.role)) as any;

    return { user };
  }

  @Public()
  @ResponseMessage('Get User by refresh token')
  @Get('/refresh')
  handleRefreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refresh_token'];
    return this.authService.processNewToken(refreshToken, response);
  }

  @ResponseMessage('Logout User')
  @Post('/logout')
  handleLogout(
    @Res({ passthrough: true }) response: Response,
    @Users() user: IUser,
  ) {
    return this.authService.logout(response, user);
  }

  ///send mail

  @Get('mail')
  @Public()
  testMail() {
    this.mailerService.sendMail({
      to: 'minhlapro01@gmail.com', // List of receivers
      subject: 'Testing Nest MailerModule', // Subject line
      text: 'welcome', // Plaintext body
      template: 'register',
      context: {
        name: 'minh',
        activationCode: 123,
      },
    });

    return 'ok';
  }

  // re-send mail
  @Public()
  @ResponseMessage('re-verify register code')
  @Post('retry-active')
  retryActive(@Body('email') email: string) {
    return this.authService.retryActive(email);
  }
  /// send forgot password mail
  @Public()
  @ResponseMessage('re-password register code')
  @Post('retry-password')
  retryPassword(@Body('email') email: string) {
    return this.authService.retryPassword(email);
  }
  /// change-password

  @Public()
  @ResponseMessage('change-password')
  @Post('change-password')
  changePassword(@Body() data: ChangePasswordDto) {
    return this.authService.changePassword(data);
  }
}
