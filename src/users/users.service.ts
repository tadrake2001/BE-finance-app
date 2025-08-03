import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schemas';
import * as bcrypt from 'bcryptjs';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { SoftDeleteDocument } from 'mongoose-delete';
import { User as UserDecorator } from '../decorator/customize';
import type { IUser } from './users.interface';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteDocument<UserDocument>,
  ) {}

  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  }

  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, projection ,population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    let offset = (+currentPage - 1) * (+limit);
    let defaultLimit = +limit ? +limit : 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);
      
    const result = await this.userModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as unknown as string )
      .populate(population)
      .exec();

      return {
        meta: {
          current: currentPage, //trang hiện tại
          pageSize: limit, //số lượng bản ghi đã lấy
          pages: totalPages, //tổng số trang với điều kiện query
          total: totalItems // tổng số phần tử (số bản ghi)
        },
        result //kết quả query
        }
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id))
      return `not found user`;

    return this.userModel.findOne({
      _id: id
    }).select("-password");
  }

  async findOneByEmail(email: string) {
    return this.userModel.findOne({
      email: email
    });
  }

  async updateGoogleInfo(userId: string, googleId: string, avatar: string) {
    return await this.userModel.updateOne(
      { _id: userId },
      { 
        googleId: googleId,
        avatar: avatar
      }
    );
  }

  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }

  async update(updateUserDto: UpdateUserDto, user: IUser) {
    const updated = await this.userModel.updateOne({ _id: updateUserDto._id }, { ...updateUserDto,
    updateBy: {
      _id: user._id,
      email: user.email,
    } })
    return updated;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id))
      return `not found user`;
    const foundUser = await this.userModel.findById(id);
    if (foundUser.email === "tadrake2003@gmail.com") {
      throw new BadRequestException("Cannot delete admin account");
    }
    await this.userModel.updateOne({ _id: id }, {
      deletedBy: {
        _id: user._id,
        email: user.email,
      }
    });
    return this.userModel.softDelete({
      _id: id
    })
  }

  async register(user: RegisterUserDto) {
    const { name, email, password, googleId, avatar } = user;
    
    // Kiểm tra user đã tồn tại
    const isExist = await this.userModel.findOne({ email });
    console.log("🚀 ~ UsersService ~ register ~ isExist:", isExist)
    if (isExist) {
      throw new BadRequestException("Email đã tồn tại");
    }

    // Hash password nếu có
    const hashPassword = password ? this.getHashPassword(password) : undefined;
    
    let newRegisterUser = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      googleId,
      avatar,
    })
    return newRegisterUser;
}   
 async create(createUserDto: CreateUserDto, @UserDecorator() user: IUser) {
   const { name, email, password } = createUserDto;
    const hashPassword = this.getHashPassword(password);
    const isExist = await this.userModel.findOne({ email });
    console.log("🚀 ~ UsersService ~ create ~ isExist:", isExist)
    if (isExist) {
      throw new BadRequestException("Email đã tồn tại");
    }
    let newUser = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      createdBy: {
        _id: user._id,
        email: user.email,
      }
    })
    return newUser;
  }

  updateUserToken = async (refreshToken: string, _id: string) => {
    return await this.userModel.updateOne({ _id }, {
        refreshToken
    })
  }

  findUserByToken = async (refreshToken: string) => {
    return await this.userModel.findOne({ refreshToken });
  }
}
