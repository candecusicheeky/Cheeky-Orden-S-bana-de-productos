
export interface XmlProduct {
  id: string;
  title: string;
  description: string;
  imageLink: string;
  grupoSku: string;
  codigoComercial: string;
}

export interface CsvProduct {
  'Codigo Comercial': string;
  'Edad': string;
  'Género': string;
  'Grupo (Fórmula)': string;
  'SKU': string;
  'Tipo Prenda': string;
  'TITULO': string;
  'Ranking Analytics': number;
  'Rankign Locales': number;
  'STOCK ECOMMERCE': number;
  'STOCK LOCALES': number;
  'IMAGEN CARGADA': 'SI' | 'NO';
  'COLOR': string;
  'TALLE':string;
  'PRICE_CENTS'?: number; // Assuming this column can exist
  'NEW IN'?: string; // date string or '#N/A'
  'FOTO CAMPAÑA'?: string;
  'FOTO MODELO'?: string;
  'VIDEO'?: string;
}

export enum MediaType {
  CAMPAIGN = 'CAMPAIGN',
  MODEL = 'MODEL',
  VIDEO = 'VIDEO',
  PRODUCT = 'PRODUCT',
}

export interface ProductVariant {
  id: string; // Grupo SKU
  title: string;
  description: string;
  imageLink: string;
  codigoComercial: string;
  grupoSku: string;
  color: string;
  talles: string[];
  tipoPrenda: string;
  edad: string;
  genero: string;
  stockEcommerce: number;
  stockLocales: number;
  rankingAnalytics: number;
  rankingLocales: number;
  newInDate: Date | null;
  familyName?: string;
  mediaType: MediaType;
  campaignName?: string;
  hasStock: boolean;
  hasPrice: boolean;
  
  // Pre-calculated fields for performance optimization
  normalizedColor: string;
  normalizedType: string;
  vibe: string;
}

export enum Age {
  BEBE = 'BEBE',
  TODDLER = 'TODDLER',
  KIDS = 'KIDS',
}

export enum Gender {
  FEMENINO = 'FEMENINO',
  MASCULINO = 'MASCULINO',
  UNISEX = 'UNISEX',
}

export interface RowRule {
  id: string;
  age: Age | '';
  gender: Gender | '';
  productTypes?: string[];
}

export enum SortLogic {
  SEQUENTIAL = 'SEQUENTIAL',
  FAMILY = 'FAMILY',
}

export interface SortingRules {
  rowSequencing: RowRule[];
  logic: SortLogic;
}