export interface NormalizedLocation {
  id: number | string;
  name: string;
  parentId?: number | string;
}

/**
 * Cập nhật sáp nhập hành chính mới nhất (2025)
 */
const ADMIN_UNIT_MAP: Record<string, string> = {
  // TP.HCM
  'QUẬN 2': 'THÀNH PHỐ THỦ ĐỨC',
  'QUẬN 9': 'THÀNH PHỐ THỦ ĐỨC',
  'THỦ ĐỨC': 'THÀNH PHỐ THỦ ĐỨC',

  // Hà Nội
  'HÀ ĐÔNG': 'QUẬN HÀ ĐÔNG',
  'TỪ LIÊM': 'QUẬN NAM TỪ LIÊM',

  // Bình Dương
  'THỊ XÃ DĨ AN': 'THÀNH PHỐ DĨ AN',
  'THỊ XÃ THUẬN AN': 'THÀNH PHỐ THUẬN AN',
};

/**
 * Chuẩn hóa tên địa danh
 */
export function normalizeLocationName(name: string): string {
  if (!name) return '';
  const upper = name.trim().toUpperCase();
  return ADMIN_UNIT_MAP[upper] || name.trim();
}

/**
 * Chuẩn hóa dữ liệu hành chính 2 cấp (Tỉnh → Xã/Phường)
 */
export function normalizeAdministrativeData(
  raw: any[],
  level: 'province' | 'ward'
): NormalizedLocation[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const name =
      item.PROVINCE_NAME || item.WARDS_NAME || item.COMMUNE_NAME || item.NAME || 'Không xác định';

    const id = item.PROVINCE_ID || item.WARDS_ID || item.COMMUNE_ID || item.ID;
    const parentId = item.PROVINCE_ID || undefined;

    return {
      id,
      parentId,
      name: normalizeLocationName(name),
    };
  });
}
