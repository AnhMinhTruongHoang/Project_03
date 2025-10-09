import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { MailerService } from '@nestjs-modules/mailer';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import { IUser } from 'src/types/user.interface';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationStatus,
  NotificationType,
} from './schemas/notification.schemas';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: SoftDeleteModel<NotificationDocument>,
    private readonly mailerService: MailerService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.notificationModel.create({
      ...dto,
      status: NotificationStatus.PENDING,
    });

    // Gửi thực tế theo type
    if (dto.type === NotificationType.EMAIL) {
      await this.sendEmail(notification);
    }

    return notification;
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.notificationModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const results = await this.notificationModel
      .find(filter)
      .skip(offset)
      .limit(limit)
      .sort(sort as any)
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
      results,
    };
  }

  async findOne(id: string) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async update(id: string, dto: UpdateNotificationDto) {
    const notification = await this.notificationModel.findByIdAndUpdate(
      id,
      dto,
      {
        new: true,
      },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async remove(id: string, user: IUser) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isDeleted = true;
    notification.deletedAt = new Date();
    notification.deletedBy = {
      _id: new mongoose.Types.ObjectId(user._id),
      email: user.email,
    };

    await notification.save();
    return { message: 'Notification deleted' };
  }

  private async sendEmail(notification: NotificationDocument) {
    await this.mailerService.sendMail({
      to: notification.recipient,
      subject: notification.title,
      template: 'notification.hbs',
      context: {
        message: notification.message,
      },
    });

    await this.notificationModel.updateOne(
      { _id: notification._id },
      { status: 'SENT' },
    );
  }
}
