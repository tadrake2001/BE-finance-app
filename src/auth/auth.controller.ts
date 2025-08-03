import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public, ResponseMessage, User } from "src/decorator/customize";
import { RegisterUserDto } from "src/users/dto/create-user.dto";
import { LocalAuthGuard } from "./local-auth.guard";
import type { Request, Response } from "express";
import type { IUser } from "src/users/users.interface";
import { AuthGuard } from "@nestjs/passport";

@Controller('auth') 
export class AuthController {
  constructor(
    private authService: AuthService,
  ) { }

 @Public()
 @ResponseMessage('Login success')
 @UseGuards(LocalAuthGuard)
 @Post('/login')
 handleLogin(
  @Req() req,
  @Res({passthrough: true}) response: Response,
 ) {
   return this.authService.login(req.user, response);
 }

 @Public()
 @ResponseMessage('Test login with email')
 @Post('/login-test')
 handleLoginTest(
  @Body() body: { email: string; password: string },
  @Res({passthrough: true}) response: Response,
 ) {
   // Simulate login for testing
   return {
     message: 'Login test endpoint',
     body: body,
     note: 'Use /login with LocalAuthGuard for actual authentication'
   };
 }

 @Public()
 @ResponseMessage('Register success')
 @Post('/register')
 handleRegister(
  @Body() registerUserDto: RegisterUserDto) {
     return this.authService.register(registerUserDto);
 }

 @ResponseMessage('Get user information')
 @Get('/account')
 async handleGetAccount(@User() user: IUser) {
   return { user };
 }

 @Public()
 @ResponseMessage('Google OAuth login')
 @Get('/google')
 @UseGuards(AuthGuard('google'))
 async googleLogin() {
   // Google OAuth sẽ tự động redirect
   // Endpoint này chỉ để khởi tạo Google OAuth flow
 }

 @Public()
 @ResponseMessage('Google OAuth callback')
 @Get('/google/callback')
 @UseGuards(AuthGuard('google'))
 async googleCallback(
   @Req() req,
   @Res() response: Response,
 ) {
   // Xử lý callback từ Google OAuth
   const user = req.user;
   const result = await this.authService.loginForGoogle(user);
   
   // Tạo URL redirect với token và user data
   const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
   const redirectUrl = new URL('/auth/google-success', frontendUrl);
   
   // Thêm token và user data vào URL params
   redirectUrl.searchParams.set('access_token', result.access_token);
   redirectUrl.searchParams.set('user_id', result.user._id);
   redirectUrl.searchParams.set('user_name', result.user.name);
   redirectUrl.searchParams.set('user_email', result.user.email);
   redirectUrl.searchParams.set('user_avatar', result.user.avatar);
   
   // Redirect về frontend
   response.redirect(redirectUrl.toString());
 }

 @Public()
 @ResponseMessage('Test Google OAuth configuration')
 @Get('/google/test')
 async testGoogleConfig() {
   const clientId = process.env.GOOGLE_CLIENT_ID;
   const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
   const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
   
   return {
     message: 'Google OAuth Configuration Test',
     hasClientId: !!clientId,
     hasClientSecret: !!clientSecret,
     hasCallbackUrl: !!callbackUrl,
     callbackUrl: callbackUrl,
     isConfigured: !!(clientId && clientSecret && callbackUrl)
   };
 }

 @Get('test123')
 @UseGuards(AuthGuard('jwt'))
 async test123(@Res() res) {
   res.json('success');
 }

 @Public()
 @ResponseMessage('Get user refresh token')
 @Get('/refresh')
 handleRefreshToken(
  @Req() req: Request,
  @Res({passthrough: true}) response: Response,
 ) {
  const refreshToken = req.cookies['refresh_token'];
  return this.authService.processNewToken(refreshToken, response);
 }

 @ResponseMessage('Logout success')
 @Post('/logout')
 handleLogout(
  @Res({passthrough: true}) response: Response,
  @User() user: IUser,
 ) {
  return this.authService.logout(response, user);
 }
}