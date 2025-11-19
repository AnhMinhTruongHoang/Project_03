import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User as UserM, UserDocument } from './schemas/user.schema';
import mongoose from 'mongoose';
import { genSaltSync, hashSync, compareSync } from 'bcryptjs';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import { Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { MailerService } from '@nestjs-modules/mailer';
import dayjs from 'dayjs';
import { CodeAuthDto } from './dto/code-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { customAlphabet } from 'nanoid';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserM.name)
    private userModel: SoftDeleteModel<UserDocument>,
    private mailerService: MailerService,
  ) { }

  /* ------------ Helpers ------------ */
  private generateCode6(): string {
    // 6 ký tự chữ hoa + số, ví dụ: 3F2B8C
    const gen = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
    return gen();
  }

  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }

  // Hash password bằng bcrypt
  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  };

  // Gửi email kích hoạt
  async sendVerificationEmail(email: string, name: string, codeId: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Activate your account',
      template: 'register.hbs',
      context: {
        name: name ?? email,
        activationCode: codeId,
      },
    });
  }

  /* ------------ Admin create user ------------ */
  async create(createUserDto: CreateUserDto, @Users() user: IUser) {
    const {
      name,
      email,
      password,
      age,
      gender,
      address,
      role = 'USER',
      avatarUrl,
    } = createUserDto;

    const emailNorm = this.normalizeEmail(email);
    const isExist = await this.userModel.findOne({ email: emailNorm });
    if (isExist) {
      throw new BadRequestException(`Email: ${emailNorm} already exists.`);
    }

    const hashPassword = this.getHashPassword(password);

    const newUser = await this.userModel.create({
      name,
      email: emailNorm,
      password: hashPassword,
      age,
      gender,
      address,
      role: role || 'USER',
      avatarUrl,
      isActive: false,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return newUser;
  }

  /* ------------ Self-register ------------ */
  async register(user: RegisterUserDto) {
    const { name, email, password, age, gender, address } = user;

    const emailNorm = this.normalizeEmail(email);
    const isExist = await this.userModel.findOne({ email: emailNorm });
    if (isExist) {
      throw new BadRequestException(`Email: ${emailNorm} is existed.`);
    }

    // mã 6 ký tự
    const codeId = this.generateCode6();
    const hashPassword = this.getHashPassword(password);

    const newRegister = await this.userModel.create({
      name,
      email: emailNorm,
      password: hashPassword,
      age,
      gender,
      address,
      role: 'USER',
      isActive: false,
      codeId,
      codeExpired: dayjs().add(1, 'day'),
    });

    await this.sendVerificationEmail(emailNorm, name, codeId);
    return newRegister;
  }

  /* ------------ Active by code ------------ */
  async handleActive(data: CodeAuthDto) {
    const user = await this.userModel.findOne({
      _id: data._id,
      codeId: data.code,
    });

    if (!user) throw new BadRequestException('Invalid Code');
    if (dayjs().isAfter(user.codeExpired)) {
      throw new BadRequestException('Activation code expired!');
    }

    await this.userModel.updateOne({ _id: data._id }, { isActive: true });
    return { message: 'Account activated successfully' };
  }

  /* ------------ Retry Active (resend code) ------------ */
  async retryActive(email: string) {
    const emailNorm = this.normalizeEmail(email);
    const user = await this.userModel.findOne({ email: emailNorm });

    if (!user) throw new BadRequestException('Account does not exist');
    if (user.isActive)
      throw new BadRequestException('Account is already activated');

    const codeId = this.generateCode6();
    await this.userModel.updateOne(
      { _id: user._id },
      {
        codeId,
        codeExpired: dayjs().add(1, 'day'),
      },
    );

    await this.sendVerificationEmail(user.email, user.name, codeId);
    return { _id: user._id };
  }

  /* ------------ Retry Forgot Password (resend code) ------------ */
  async retryPassword(email: string) {
    const emailNorm = this.normalizeEmail(email);
    const user = await this.userModel.findOne({ email: emailNorm });

    if (!user) {
      throw new BadRequestException('Account does not exist');
    }

    const codeId = this.generateCode6();
    await this.userModel.updateOne(
      { _id: user._id },
      {
        codeId,
        codeExpired: dayjs().add(1, 'day'),
      },
    );

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Change your password active code',
      template: 'resetpassword.hbs',
      context: {
        name: user?.name ?? user.email,
        resetCode: codeId,
      },
    });

    return { _id: user._id, email: user.email };
  }

  /* ------------ Change password (using code) ------------ */
  async changePassword(data: ChangePasswordDto) {
    if (data.confirmPassword !== data.password) {
      throw new BadRequestException('Password is not match !');
    }

    const emailNorm = this.normalizeEmail(data.email);
    const user = await this.userModel.findOne({ email: emailNorm });

    if (!user) {
      throw new BadRequestException('Account does not exist');
    }

    // (Tuỳ schema ChangePasswordDto của bạn có trường code hay không)
    // Nếu có truyền code thì kiểm tra luôn cho chặt:
    if ((data as any).code && (data as any).code !== user.codeId) {
      throw new BadRequestException('Invalid or expired code');
    }

    // kiểm tra hạn code
    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (!isBeforeCheck) {
      throw new BadRequestException('Mã code không hợp lệ hoặc đã hết hạn');
    }

    const newPassword = this.getHashPassword(data.password);
    await user.updateOne({ password: newPassword });
    return { isBeforeCheck: true };
  }

  /* ------------ Find All ------------ */
  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete (filter as any).current;
    delete (filter as any).pageSize;

    const offset = (+currentPage - 1) * +limit;
    const defaultLimit = +limit || 10;

    const totalItems = await this.userModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.userModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .select('-password')
      .populate(population as any)
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  /* ------------ Find One ------------ */
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return 'Not found user';

    return this.userModel
      .findOne({ _id: id })
      .select('-password')
      .populate({ path: 'branchId', select: { name: 1, _id: 1 } })
      .populate({ path: 'role', select: { name: 1, _id: 1 } });
  }

  /* ------------ For login ------------ */
  findOneByUsername(username: string) {
    const emailNorm = this.normalizeEmail(username);
    return this.userModel
      .findOne({ email: emailNorm, isDeleted: false })
      .select('+password');
  }

  /* ------------ Find by Email ------------ */
  async findByEmail(email: string) {
    const emailNorm = this.normalizeEmail(email);
    if (!emailNorm) throw new BadRequestException('Email is required');

    return this.userModel
      .findOne({ email: emailNorm })
      .populate({ path: 'role', select: { name: 1, _id: 1 } });
  }

  /* ------------ Password compare ------------ */
  isValidPassword(password: string, hash?: string) {
    return !!hash && compareSync(password, hash);
  }

  /* ------------ Update (admin) ------------ */
  async update(updateUserDto: UpdateUserDto, user: IUser, _id: string) {
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const updated = await this.userModel.updateOne(
      { _id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    if (updated.modifiedCount === 0) {
      throw new BadRequestException('Update failed');
    }

    return { message: 'User updated', updated };
  }

  /* ------------ Soft delete (admin) ------------ */
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) return 'Not found user';

    const foundUser = await this.userModel.findById(id);
    if (foundUser?.email === 'admin@gmail.com') {
      throw new BadRequestException('Cannot delete admin@gmail.com');
    }

    await this.userModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    await this.userModel.softDelete({ _id: id });
    return { message: 'User deleted' };
  }

  /* ------------ Token helpers ------------ */
  async updateUserToken(refreshToken: string, _id: string) {
    const updated = await this.userModel.updateOne({ _id }, { refreshToken });
    return { message: 'Token updated', updated };
  }

  async findUserByToken(refreshToken: string) {
    return this.userModel
      .findOne({ refreshToken })
      .populate({ path: 'role', select: { name: 1 } });
  }

  /* ------------ Strategies helpers ------------ */
  async validateUser(username: string, password: string) {
    const emailNorm = this.normalizeEmail(username);
    const user = await this.userModel.findOne({ email: emailNorm });

    if (!user) return null;
    if (!this.isValidPassword(password, user.password)) return null;

    return user;
  }

  async findById(_id: string) {
    if (!mongoose.Types.ObjectId.isValid(_id)) return null;
    return this.userModel.findById(_id).select('-password');
  }
}
