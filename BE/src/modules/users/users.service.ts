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
import { v4 as uuidv4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import dayjs from 'dayjs';
import { CodeAuthDto } from './dto/code-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserM.name)
    private userModel: SoftDeleteModel<UserDocument>,
    private mailerService: MailerService,
  ) {}

  // NOTE: Hashes a password with bcrypt
  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  };

  // NOTE: Sends activation email to user
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

  // NOTE: Creates a new user (admin-level creation)
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

    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email: ${email} already exists.`);
    }

    const hashPassword = this.getHashPassword(password);

    const newUser = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      age,
      gender,
      address,
      role: 'USER',
      avatarUrl,
      isActive: false,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return newUser;
  }

  // NOTE: Register user (self-registration)
  async register(user: RegisterUserDto) {
    const { name, email, password, age, gender, address } = user;
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email: ${email} is existed.`);
    }

    const codeId = uuidv4();
    const hashPassword = this.getHashPassword(password);
    const newRegister = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      age,
      gender,
      address,
      role: 'USER',
      isActive: false,
      codeId,
      codeExpired: dayjs().add(1, 'day'),
    });

    await this.sendVerificationEmail(email, name, codeId);

    return newRegister;
  }

  // NOTE: Verify account with code (email activation)
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

  // NOTE: Retry activation (resend code)
  async retryActive(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) throw new BadRequestException('Account does not exist');
    if (user.isActive)
      throw new BadRequestException('Account is already activated');

    const codeId = uuidv4();
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

  // NOTE: Retry forgot Password (resend code)
  async retryPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Account does not exist');
    }

    const codeId = uuidv4();
    await this.userModel.updateOne(
      { _id: user._id },
      {
        codeId,
        codeExpired: dayjs().add(1, 'day'),
      },
    );

    // Send email
    this.mailerService.sendMail({
      to: user.email, // recipient
      subject: 'Change your password active code',
      template: 'resetpassword.hbs',
      context: {
        name: user?.name ?? user.email,
        resetCode: codeId,
      },
    });
    return { _id: user._id, email: user.email };
  }
  // NOTE: change Password (resend code)
  async changePassword(data: ChangePasswordDto) {
    if (data.confirmPassword !== data.password) {
      throw new BadRequestException('Password is not match !');
    }
    const user = await this.userModel.findOne({ email: data.email });

    if (!user) {
      throw new BadRequestException('Account does not exist');
    }

    // check expire code
    const isBeforeCheck = dayjs().isBefore(user.codeExpired);

    if (isBeforeCheck) {
      // valid => update password
      const newPassword = await this.getHashPassword(data.password);
      await user.updateOne({ password: newPassword });

      return { isBeforeCheck };
    } else {
      throw new BadRequestException('Mã code không hợp lệ hoặc đã hết hạn');
    }
  }

  // NOTE: Find all users with pagination, filtering and sorting
  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

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
      .populate(population)
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

  // NOTE: Find a single user by ID
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return 'Not found user';

    return this.userModel
      .findOne({ _id: id })
      .select('-password')
      .populate({ path: 'role', select: { name: 1, _id: 1 } });
  }

  // NOTE: Find a user by username/email for login
  findOneByUsername(username: string) {
    return this.userModel
      .findOne({ email: username })
      .populate({ path: 'role', select: { name: 1 } });
  }

  // NOTE: Find a user by email
  async findByEmail(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    return this.userModel
      .findOne({ email })
      .populate({ path: 'role', select: { name: 1, _id: 1 } });
  }

  // NOTE: Compare password with hash (login)
  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }

  // NOTE: Update user data (admin only)
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

  // NOTE: Soft delete user (admin only)
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

  // NOTE: Update refresh token for user (used after login or token refresh)
  async updateUserToken(refreshToken: string, _id: string) {
    const updated = await this.userModel.updateOne({ _id }, { refreshToken });
    return { message: 'Token updated', updated };
  }

  // NOTE: Find user by refresh token (used in auth flow)
  async findUserByToken(refreshToken: string) {
    return this.userModel
      .findOne({ refreshToken })
      .populate({ path: 'role', select: { name: 1 } });
  }

  // NOTE: Validate user khi đăng nhập (dùng trong LocalStrategy)
  async validateUser(username: string, password: string) {
    const user = await this.userModel.findOne({ email: username });

    if (!user) return null;
    if (!this.isValidPassword(password, user.password)) return null;

    return user; // dùng cho req.user trong LocalStrategy
  }

  // NOTE: Tìm user theo _id (dùng trong JwtStrategy)
  async findById(_id: string) {
    if (!mongoose.Types.ObjectId.isValid(_id)) return null;

    return this.userModel.findById(_id).select('-password');
  }
}
