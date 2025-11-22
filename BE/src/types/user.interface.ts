// users.interface.ts

import { Types } from "mongoose";

export type RoleType = 'USER' | 'ADMIN' | 'STAFF';
export type AccountType = 'LOCAL' | 'GOOGLE';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: RoleType;
  phone: string;
  age: number;
  gender: string;
  address: string;
  avatar: string;
  accountType?: AccountType;
  branchId?: Types.ObjectId | string | null;     
  BranchId?: Types.ObjectId | string | null;     
}
