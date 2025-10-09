import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import aqp from 'api-query-params';
import { Branch, BranchDocument } from './schemas/branch.schemas';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name)
    private branchModel: SoftDeleteModel<BranchDocument>,
  ) {}

  async create(createBranchDto: CreateBranchDto) {
    return this.branchModel.create(createBranchDto);
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.branchModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const results = await this.branchModel
      .find(filter)
      .skip(offset)
      .limit(limit)
      .sort(sort as any)
      .populate(population)
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
    const branch = await this.branchModel.findById(id);
    if (!branch) throw new NotFoundException('Không tìm thấy chi nhánh');
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.branchModel.findByIdAndUpdate(
      id,
      updateBranchDto,
      {
        new: true,
      },
    );
    if (!branch) throw new NotFoundException('Không tìm thấy chi nhánh');
    return branch;
  }

  async remove(id: string) {
    const branch = await this.branchModel.findById(id);
    if (!branch) throw new NotFoundException('Không tìm thấy chi nhánh');

    branch.isDeleted = true;
    branch.deletedAt = new Date();
    await branch.save();

    return { message: 'Đã xóa chi nhánh' };
  }
}
