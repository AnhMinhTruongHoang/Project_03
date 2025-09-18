export interface IMember {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  membershipType: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'pending';
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}
