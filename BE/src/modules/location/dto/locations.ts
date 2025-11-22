export type Region = 'North' | 'Central' | 'South';
export type ProvinceCode = string;

// Dùng object để tra cứu nhanh + dễ maintain
export const PROVINCE_TO_REGION: Record<string, Region> = {
  // === MIỀN BẮC ===
  HN: 'North',     // Hà Nội
  HP: 'North',     // Hải Phòng
  HY: 'North',     // Hưng Yên
  QNH: 'North',    // Quảng Ninh
  NB: 'North',     // Ninh Bình
  PTO: 'North',    // Phú Thọ
  BNH: 'North',    // Bắc Ninh
  LCI: 'North',    // Lào Cai
  TNN: 'North',    // Thái Nguyên
  LSN: 'North',    // Lạng Sơn
  CB: 'North',     // Cao Bằng
  TQ: 'North',     // Tuyên Quang
  DBN: 'North',    // Điện Biên
  LCU: 'North',    // Lai Châu
  SLA: 'North',    // Sơn La

  // === MIỀN TRUNG ===
  DNA: 'Central',  // Đà Nẵng
  HUE: 'Central',  // Huế
  QN: 'Central',   // Quảng Ngãi
  QT: 'Central',   // Quảng Trị
  NA: 'Central',   // Nghệ An
  HT: 'Central',   // Hà Tĩnh
  TH: 'Central',   // Thanh Hóa

  // === MIỀN NAM ===
  HCM: 'South',    // TP Hồ Chí Minh
  CT: 'South',     // Cần Thơ
  TN: 'South',     // Tây Ninh
  GL: 'South',     // Gia Lai
  KH: 'South',     // Khánh Hòa
  LD: 'South',     // Lâm Đồng
  DL: 'South',     // Đắk Lắk
  DN: 'South',     // Đồng Nai
  DT: 'South',     // Đồng Tháp
  CM: 'South',     // Cà Mau
  VL: 'South',     // Vĩnh Long
  AG: 'South',     // An Giang
};

export const getRegionByProvinceCode = (code: string): Region | null => {
  const upperCode = code.toUpperCase().trim();
  return PROVINCE_TO_REGION[upperCode] || null;
};