import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from 'src/users/dto/create-user.dto';
import { IUser } from 'src/users/users.interface';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import ms from 'ms';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (user) {
            const isValid = this.usersService.isValidPassword(pass, user.password);
            if (isValid === true) {
                return user;
            }
        }
        
        return null;
    }

    async findOrCreateGoogleUser(googleUser: any): Promise<any> {
        const { email, firstName, lastName, picture, googleId } = googleUser;
        
        // Tìm user theo email
        let user = await this.usersService.findOneByEmail(email);
        
        if (!user) {
            // Tạo user mới nếu chưa tồn tại
            const newUserData: RegisterUserDto = {
                name: `${firstName} ${lastName}`,
                email: email,
                password: this.generateRandomPassword(), // Tạo password ngẫu nhiên
                googleId: googleId,
                avatar: picture,
            };
            
            user = await this.usersService.register(newUserData);
        } else {
            // Cập nhật thông tin Google nếu user đã tồn tại
            if (!user.googleId) {
                await this.usersService.updateGoogleInfo(user._id.toString(), googleId, picture);
                user.googleId = googleId;
                user.avatar = picture;
            }
        }
        
        return {
            ...user.toObject(),
        };
    }

    private generateRandomPassword(): string {
        return Math.random().toString(36).slice(-8);
    }

    async login(user: IUser, response: Response) {
        const { _id, name, email, avatar } = user;
        const payload = {
            sub: "token login",
            iss: "from server",
            _id,
            name,
            email,
            avatar
        };
        const refresh_token = this.createRefreshToken(payload);

        await this.usersService.updateUserToken(refresh_token, _id);

        response.cookie('refresh_token', refresh_token,{
            httpOnly: true,
            maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')) ,
        });

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                _id,
                name,
                email,
                avatar,
            }
        };
    }

    async loginForGoogle(user: IUser) {
        const { _id, name, email, avatar } = user;
        const payload = {
            sub: "token login",
            iss: "from server",
            _id,
            name,
            email,
            avatar,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                _id,
                name,
                email,
                avatar,
            }
        };
    }

    async register(user: RegisterUserDto) {
        let newUser = await this.usersService.register(user)
        
        return {
            _id: newUser?._id,
            createAt: newUser?.createdAt
        };
    }

    async create(user: RegisterUserDto) {
        let newUser = await this.usersService.register(user)
        
        return {
            newUser
        };
    }

    createRefreshToken = (payload) => {
        const refeshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>("JWT_REFRESH_TOKEN_SECRET"),
            expiresIn: ms(this.configService.get<string>("JWT_REFRESH_EXPIRE")) ,
        });
        return refeshToken;
    }

    processNewToken = async (refreshToken: string, response: Response) => {
        try {
            let a = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>("JWT_REFRESH_TOKEN_SECRET"),
            })
           let user = await this.usersService.findUserByToken(refreshToken);
           if(user){
               const { _id, name, email } = user;
            const payload = {
                sub: "token refresh",
                iss: "from server",
                _id,
                name,
                email,
            };
            const refresh_token = this.createRefreshToken(payload);

            await this.usersService.updateUserToken(refresh_token, _id.toString());
            response.clearCookie('refresh_token');
            
            response.cookie('refresh_token', refresh_token,{
                httpOnly: true,
                maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE'))  ,
            });
    
            return {
                access_token: this.jwtService.sign(payload),
                user: {
                    _id,
                    name,
                    email,
                }
            };
        
           } else {
            throw new BadRequestException("Refresh token không hợp lệ. Vui lòng login");
           }
           console.log(user);
        } catch (error) {
            throw new BadRequestException("Refresh token không hợp lệ. Vui lòng login");

        }
    }
    logout = async (response: Response, user: IUser) => {
        await this.usersService.updateUserToken('', user._id);
        response.clearCookie('refresh_token');
        return 'ok'
    }
}
