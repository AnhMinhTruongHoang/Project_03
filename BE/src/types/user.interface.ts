// users.interface.ts

export type RoleType = 'USER' | 'ADMIN';
export type AccountType = 'LOCAL' | 'GOOGLE';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role?: RoleType;
  phone: string;
  age: number;
  gender: string;
  address: string;
  avatar: string;
  accountType?: AccountType;
}
