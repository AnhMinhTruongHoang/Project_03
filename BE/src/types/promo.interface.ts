export interface IPromo {
  _id?: string;
  code: string; // Mã khuyến mãi (ví dụ: SUMMER2025)
  description?: string; // Mô tả nội dung khuyến mãi
  discountPercent?: number; // % giảm giá (nếu là giảm theo phần trăm)
  discountAmount?: number; // Số tiền giảm (nếu giảm trực tiếp)
  validFrom: Date; // Thời gian bắt đầu áp dụng
  validTo: Date; // Thời gian kết thúc
  usageLimit?: number; // Giới hạn số lần sử dụng
  usedCount?: number; // Đã sử dụng bao nhiêu lần
  isActive: boolean; // Có đang hoạt động không
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string; // ID của user tạo
}
