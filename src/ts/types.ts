export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  blocks?: string[];
  color?: string;
  size?: string;
  category?: string;
  salesStatus?: boolean;
  rating?: number;
  popularity?: number;
}

export interface CatalogData {
  data?: Product[];
  topBestSets?: Array<{
    name: string;
    price: number;
    imageUrl: string;
    rating: number;
  }>;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  color: string;
  size: string;
  quantity: number;
}

