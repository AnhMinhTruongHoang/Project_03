import { ProvinceCode, Region } from 'src/types/location.type';

export const REGIONS: Record<Region, ProvinceCode[]> = {
  North: [
    'HN',
    'HP',
    'NB',
    'TB',
    'ND',
    'VP',
    'BG',
    'BNH',
    'LCI',
    'LSN',
    'CB',
    'HG',
    'TQ',
  ],
  Central: ['HUE', 'TH', 'NA', 'HT', 'QT', 'DNA', 'GL', 'KH', 'LD', 'DL'],
  South: ['HCM', 'DN', 'CT', 'TN', 'DT', 'KG', 'BT', 'BL', 'CM', 'AG'],
};

export function getRegionByProvinceCode(code: ProvinceCode): Region | null {
  if (REGIONS.North.includes(code)) return 'North';
  if (REGIONS.Central.includes(code)) return 'Central';
  if (REGIONS.South.includes(code)) return 'South';
  return null;
}
