export interface Product {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  images?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}
