import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Membership, MembershipDocument } from './schema/membership.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { IUser } from 'src/types/user.interface';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectModel(Membership.name)
    private membershipModel: SoftDeleteModel<MembershipDocument>,
    private mailerService: MailerService,
  ) {}

  async create(
    data: Partial<Membership>,
    user: IUser,
  ): Promise<MembershipDocument> {
    const created = new this.membershipModel({
      ...data,
      createdBy: { _id: user._id, email: user.email },
    });
    return created.save();
  }

  async findAll(): Promise<MembershipDocument[]> {
    return this.membershipModel.find().exec();
  }

  async findOne(id: string): Promise<MembershipDocument> {
    const membership = await this.membershipModel.findById(id).exec();
    if (!membership) throw new NotFoundException('Membership not found');
    return membership;
  }

  async update(
    id: string,
    data: Partial<Membership>,
  ): Promise<MembershipDocument> {
    const membership = await this.membershipModel.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!membership) throw new NotFoundException('Membership not found');
    return membership;
  }

  async remove(id: string): Promise<void> {
    const res = await this.membershipModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Membership not found');
  }
}
