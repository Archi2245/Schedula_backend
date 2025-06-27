import {
  Body,
  Controller,
<<<<<<< HEAD
  Get,
  Headers,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninDto } from 'src/dto/signin.dto';
import { SignupDto } from 'src/dto/signup.dto';
import { RefreshDto } from 'src/dto/refresh.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // signup endpoint

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return await this.authService.Signup(dto);
  }

  // signin endpoint

  @Post('signin')
  async signin(@Body() dto: SigninDto) {
    return await this.authService.Signin(dto);
  }

  // signout endpoint
  @Post('signout')
  async signout(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing');
    }
    const token = authHeader.split(' ')[1];
    return await this.authService.signOut(token);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return await this.authService.refresh(dto);
  }

  // Google OAuth endpoints

  // This endpoint will redirect to Google for authentication
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Query('role') role: string) {
    // This endpoint will redirect to Google for authentication
    // The role will be passed as a query parameter
  }

  // This endpoint will be called by Google after authentication
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    // user info now in req.user (set by GoogleStrategy)
    return this.authService.google_login(req.user);
  }
=======
  Post,
  Req,
  UseGuards,
  Get,
  Res,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { JwtRefreshGuard } from './refresh-token.strategy';
import { AccessTokenGuard } from './guard/access-token.guard';
import { GetCurrentUserId } from './decorator/get-current-user-id.decorator';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('signin')
  signin(@Body() dto: SigninDto) {
    return this.authService.signin(dto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('signout')
  signout(@GetCurrentUserId() userId: number) {
    return this.authService.signout(userId);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refreshTokens(@Req() req) {
    const refreshToken = req.headers['authorization']?.replace('Bearer ', '');
    return this.authService.refreshTokens(req.user.sub, refreshToken);
  }

  /**
   * 🔐 Google OAuth Login Entry Point
   * Adds `role` to session before redirecting to Google
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(@Query('role') role: 'doctor' | 'patient', @Req() req: Request) {
    (req as any).session = (req as any).session || {};
    (req as any).session['role'] = role;
    // Redirects to Google
  }

  /**
   * 🧠 Google OAuth Callback Handler
   * Gets user data from Passport and creates/fetches user
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
  const { user } = req;

  const jwt = await this.authService.handleGoogleLogin(user);

  return res.json({
    message: 'Login successful',
    token: jwt.access_token,
    role: user.role,
  });
}

>>>>>>> main
}
