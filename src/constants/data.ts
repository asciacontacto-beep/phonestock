export const USERS = [
  { id: 1, name: 'Carlos Martínez', role: 'owner', initials: 'CM', color: '#d4d4d8' },
  { id: 2, name: 'Lucía Gómez', role: 'seller', initials: 'LG', color: '#10b981' },
  { id: 3, name: 'Marcos Pérez', role: 'seller', initials: 'MP', color: '#3b82f6' },
  { id: 4, name: 'Ana Torres', role: 'seller', initials: 'AT', color: '#f43f5e' }
];

export const DEPOSITS = [
  { id: 1, name: 'Depósito Central', color: '#fafafa' },
  { id: 2, name: 'Sucursal Norte', color: '#10b981' },
  { id: 3, name: 'Sucursal Sur', color: '#3b82f6' },
  { id: 4, name: 'En tránsito', color: '#f59e0b' }
];

export const BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Motorola', 'POCO', 'Google',
  'Honor', 'Realme', 'OnePlus', 'Huawei', 'TCL', 'ZTE', 'Infinix', 'Nokia', 'LG', 'Otra'
];

/**
 * Catálogo de modelos. Es una ayuda para escribir rápido, NO una lista
 * cerrada: el selector acepta cualquier texto, porque salen modelos nuevos
 * todos los meses y esta lista siempre va a ir atrás. Si falta uno que
 * vendés seguido, agregalo acá para tenerlo a mano.
 */
export const MODELS: Record<string, string[]> = {
  Apple: [
    'iPhone 18 Pro Max', 'iPhone 18 Pro', 'iPhone Duo',
    'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Air', 'iPhone 17',
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone SE (3ra Gen)', 'iPhone SE (2da Gen)', 'iPhone SE (1ra Gen)',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
    'MacBook Air M5', 'MacBook Air M4', 'MacBook Air M3', 'MacBook Air M2', 'MacBook Air M1', 'MacBook Air (Intel)',
    'MacBook Pro M5', 'MacBook Pro M4', 'MacBook Pro M3', 'MacBook Pro M2', 'MacBook Pro M1', 'MacBook Pro (Intel)',
    'MacBook (12-inch)', 'MacBook Neo',
    'iPad Pro 13" (M5)', 'iPad Pro 11" (M5)', 'iPad Pro 13" (M4)', 'iPad Pro 11" (M4)', 'iPad Pro 12.9" (6.ª gen)', 'iPad Pro 11" (4.ª gen)', 'iPad Pro 12.9" (5.ª gen)', 'iPad Pro 11" (3.ª gen)', 'iPad Pro 12.9" (4.ª gen)', 'iPad Pro 11" (2.ª gen)', 'iPad Pro 12.9" (3.ª gen)', 'iPad Pro 11" (1.ª gen)', 'iPad Pro 12.9" (2.ª gen)', 'iPad Pro 10.5"', 'iPad Pro 12.9" (1.ª gen)', 'iPad Pro 9.7"',
    'iPad Air 13" (M4)', 'iPad Air 11" (M4)', 'iPad Air 13" (M3)', 'iPad Air 11" (M3)', 'iPad Air 13" (M2)', 'iPad Air 11" (M2)', 'iPad Air (5.ª gen - M1)', 'iPad Air (4.ª gen)', 'iPad Air (3.ª gen)', 'iPad Air 2', 'iPad Air (1.ª gen)',
    'iPad mini (7.ª gen - A17 Pro)', 'iPad mini (6.ª gen)', 'iPad mini 5', 'iPad mini 4', 'iPad mini 3', 'iPad mini 2', 'iPad mini (1.ª gen)',
    'iPad (11.ª gen)', 'iPad (10.ª gen)', 'iPad (9.ª gen)', 'iPad (8.ª gen)', 'iPad (7.ª gen)', 'iPad (6.ª gen)', 'iPad (5.ª gen)', 'iPad (4.ª gen)', 'iPad (3.ª gen)', 'iPad 2', 'iPad (1.ª gen)',
    'AirPods 4', 'AirPods 3', 'AirPods 2', 'AirPods Pro 3', 'AirPods Pro 2', 'AirPods Pro', 'AirPods Max',
    'Apple Watch Ultra 3', 'Apple Watch Ultra 2', 'Apple Watch Ultra (1.ª gen)',
    'Apple Watch Series 11', 'Apple Watch Series 10', 'Apple Watch Series 9', 'Apple Watch Series 8', 'Apple Watch Series 7', 'Apple Watch Series 6', 'Apple Watch Series 5', 'Apple Watch Series 4', 'Apple Watch Series 3', 'Apple Watch Series 2', 'Apple Watch Series 1', 'Apple Watch (1.ª gen)',
    'Apple Watch SE (3.ª gen)', 'Apple Watch SE (2.ª gen)', 'Apple Watch SE (1.ª gen)'
  ],
  Samsung: [
    'Galaxy S26 Ultra', 'Galaxy S26+', 'Galaxy S26',
    'Galaxy S25 Ultra', 'Galaxy S25 Edge', 'Galaxy S25+', 'Galaxy S25', 'Galaxy S25 FE',
    'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S24 FE',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE',
    'Galaxy S22 Ultra', 'Galaxy S22+', 'Galaxy S22',
    'Galaxy S21 Ultra', 'Galaxy S21+', 'Galaxy S21', 'Galaxy S21 FE',
    'Galaxy S20 Ultra', 'Galaxy S20+', 'Galaxy S20', 'Galaxy S20 FE',
    'Galaxy Note 20 Ultra', 'Galaxy Note 20', 'Galaxy Note 10+', 'Galaxy Note 10',
    'Galaxy A56', 'Galaxy A36', 'Galaxy A26', 'Galaxy A16', 'Galaxy A06',
    'Galaxy A55', 'Galaxy A35', 'Galaxy A25', 'Galaxy A15', 'Galaxy A05', 'Galaxy A05s',
    'Galaxy A54', 'Galaxy A34', 'Galaxy A24', 'Galaxy A14', 'Galaxy A04', 'Galaxy A04s',
    'Galaxy A53', 'Galaxy A33', 'Galaxy A23', 'Galaxy A13', 'Galaxy A03', 'Galaxy A03 Core',
    'Galaxy A52', 'Galaxy A32', 'Galaxy A22', 'Galaxy A12', 'Galaxy A02', 'Galaxy A02s',
    'Galaxy A73', 'Galaxy A72', 'Galaxy A71', 'Galaxy A51', 'Galaxy A31', 'Galaxy A21s', 'Galaxy A11',
    'Galaxy M55', 'Galaxy M35', 'Galaxy M15', 'Galaxy M14', 'Galaxy M53', 'Galaxy M23',
    'Galaxy Z Fold 7', 'Galaxy Z Flip 7', 'Galaxy Z Fold 6', 'Galaxy Z Flip 6',
    'Galaxy Z Fold 5', 'Galaxy Z Flip 5', 'Galaxy Z Fold 4', 'Galaxy Z Flip 4', 'Galaxy Z Flip 3',
    'Galaxy Tab S10 Ultra', 'Galaxy Tab S10+', 'Galaxy Tab S9 Ultra', 'Galaxy Tab S9+', 'Galaxy Tab S9',
    'Galaxy Tab S8', 'Galaxy Tab A9+', 'Galaxy Tab A9', 'Galaxy Tab A8',
    'Galaxy Buds 3 Pro', 'Galaxy Buds 3', 'Galaxy Buds 2 Pro', 'Galaxy Buds FE',
    'Galaxy Watch 7', 'Galaxy Watch 6', 'Galaxy Watch Ultra'
  ],
  Xiaomi: [
    'Xiaomi 15 Ultra', 'Xiaomi 15 Pro', 'Xiaomi 15',
    'Xiaomi 14 Ultra', 'Xiaomi 14 Pro', 'Xiaomi 14', 'Xiaomi 14T Pro', 'Xiaomi 14T',
    'Xiaomi 13 Pro', 'Xiaomi 13', 'Xiaomi 13T Pro', 'Xiaomi 13T', 'Xiaomi 12',
    'Redmi Note 14 Pro+ 5G', 'Redmi Note 14 Pro', 'Redmi Note 14',
    'Redmi Note 13 Pro+ 5G', 'Redmi Note 13 Pro', 'Redmi Note 13',
    'Redmi Note 12 Pro', 'Redmi Note 12', 'Redmi Note 11',
    'Redmi 14C', 'Redmi 13C', 'Redmi 13', 'Redmi 12C', 'Redmi 12', 'Redmi A3', 'Redmi A2',
    'Redmi Pad SE', 'Redmi Pad'
  ],
  Motorola: [
    'Moto Edge 60 Pro', 'Moto Edge 60 Fusion', 'Moto Edge 60',
    'Moto Edge 50 Ultra', 'Moto Edge 50 Pro', 'Moto Edge 50 Fusion', 'Moto Edge 50 Neo',
    'Moto Edge 40 Pro', 'Moto Edge 40 Neo', 'Moto Edge 40', 'Moto Edge 30',
    'Moto G96', 'Moto G86', 'Moto G85', 'Moto G75', 'Moto G55', 'Moto G45', 'Moto G35', 'Moto G15', 'Moto G05',
    'Moto G84', 'Moto G54', 'Moto G34', 'Moto G24', 'Moto G14', 'Moto G04',
    'Moto G82', 'Moto G72', 'Moto G62', 'Moto G52', 'Moto G42', 'Moto G32', 'Moto G22',
    'Moto G200', 'Moto G100', 'Moto G60', 'Moto G50', 'Moto G30', 'Moto G20', 'Moto G10',
    'Moto E15', 'Moto E14', 'Moto E13', 'Moto E22', 'Moto E20',
    'Moto Razr 60 Ultra', 'Moto Razr 60', 'Moto Razr 50 Ultra', 'Moto Razr 50', 'Moto Razr 40 Ultra', 'Moto Razr 40'
  ],
  POCO: [
    'POCO F7 Ultra', 'POCO F7 Pro', 'POCO F6 Pro', 'POCO F6', 'POCO F5 Pro', 'POCO F5',
    'POCO X7 Pro', 'POCO X7', 'POCO X6 Pro', 'POCO X6', 'POCO X5 Pro',
    'POCO M6 Pro', 'POCO M6', 'POCO M5', 'POCO C75', 'POCO C65', 'POCO C61'
  ],
  Google: [
    'Pixel 10 Pro XL', 'Pixel 10 Pro', 'Pixel 10',
    'Pixel 9 Pro XL', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 9a', 'Pixel 9 Pro Fold',
    'Pixel 8 Pro', 'Pixel 8', 'Pixel 8a', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a',
    'Pixel 6 Pro', 'Pixel 6', 'Pixel 6a', 'Pixel 5', 'Pixel 4a'
  ],
  Honor: [
    'Honor Magic 7 Pro', 'Honor Magic 6 Pro', 'Honor Magic 5 Pro',
    'Honor 400 Pro', 'Honor 400', 'Honor 200 Pro', 'Honor 200', 'Honor 90',
    'Honor X9c', 'Honor X9b', 'Honor X8b', 'Honor X7b', 'Honor X6b', 'Honor X5'
  ],
  Realme: [
    'Realme GT 7 Pro', 'Realme GT 6', 'Realme 14 Pro+', 'Realme 13 Pro+', 'Realme 13 Pro',
    'Realme 12 Pro+', 'Realme 12 Pro', 'Realme 12', 'Realme 11 Pro+',
    'Realme Note 60', 'Realme C75', 'Realme C67', 'Realme C65', 'Realme C55', 'Realme C53'
  ],
  OnePlus: [
    'OnePlus 13', 'OnePlus 13R', 'OnePlus 12', 'OnePlus 12R', 'OnePlus 11',
    'OnePlus Nord 4', 'OnePlus Nord CE 4', 'OnePlus Nord 3', 'OnePlus Nord CE 3'
  ],
  Huawei: [
    'Huawei Mate 60 Pro', 'Huawei Mate 50 Pro', 'Huawei P60 Pro', 'Huawei P50 Pro',
    'Huawei Nova 13', 'Huawei Nova 12', 'Huawei Nova 11', 'Huawei Y9a', 'Huawei Y7'
  ],
  TCL: ['TCL 50 Pro', 'TCL 50 SE', 'TCL 50', 'TCL 40 SE', 'TCL 40', 'TCL 30', 'TCL 20'],
  ZTE: ['ZTE Blade A75', 'ZTE Blade A55', 'ZTE Blade A54', 'ZTE Blade V50', 'ZTE Blade V40', 'ZTE Nubia Neo 3'],
  Infinix: ['Infinix Note 40 Pro', 'Infinix Note 40', 'Infinix Hot 50', 'Infinix Hot 40', 'Infinix Smart 9', 'Infinix Smart 8'],
  Nokia: ['Nokia G42', 'Nokia G22', 'Nokia C32', 'Nokia C22', 'Nokia 110', 'Nokia 105'],
  LG: ['LG K62', 'LG K52', 'LG K42', 'LG Velvet', 'LG G8', 'LG K61'],
  Otra: []
};

export const STORAGES = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

/**
 * Valor para lo que no tiene almacenamiento (auriculares, parlantes, fundas).
 *
 * Sin esto, unos AirPods entraban al inventario con "32GB" —el primer valor de
 * la lista— y después salía impreso en el ticket del cliente. Un local lo
 * reportó: vendió AirPods y el comprobante decía 32GB.
 */
export const SIN_ALMACENAMIENTO = '—';

/** Productos que no tienen capacidad: no se les pregunta. */
const SIN_CAPACIDAD = /airpods|beats|homepod|magic (mouse|keyboard|trackpad)|apple pencil|pencil|funda|cargador|auricular|parlante|smartwatch band/i;

/** ¿Ese valor de almacenamiento es real, o el marcador de "no tiene"? */
export function tieneAlmacenamiento(valor?: string | null): boolean {
  const v = (valor || '').trim();
  return v !== '' && v !== SIN_ALMACENAMIENTO && v !== '-' && v !== 'N/A';
}

/**
 * Capacidades que corresponden a un modelo. Los relojes usan medidas y los
 * auriculares no usan nada; el resto, la lista general.
 */
export function almacenamientosDe(model?: string | null): string[] {
  const m = (model || '').trim();
  if (MODEL_STORAGES[m]) return MODEL_STORAGES[m];
  if (SIN_CAPACIDAD.test(m)) return [SIN_ALMACENAMIENTO];
  return STORAGES;
}

export const MODEL_STORAGES: Record<string, string[]> = {
  'iPhone 18 Pro Max': ['256GB', '512GB', '1TB', '2TB'],
  'iPhone 18 Pro': ['256GB', '512GB', '1TB', '2TB'],
  'iPhone Duo': ['256GB', '512GB', '1TB', '2TB'],
  'iPhone 17 Pro Max': ['256GB', '512GB', '1TB', '2TB'],
  'iPhone 17 Pro': ['256GB', '512GB', '1TB'],
  'iPhone 17 Air': ['256GB', '512GB'],
  'iPhone 17': ['256GB', '512GB'],
  'iPhone 16 Pro Max': ['256GB', '512GB', '1TB'],
  'iPhone 16 Pro': ['128GB', '256GB', '512GB', '1TB'],
  'iPhone 16 Plus': ['128GB', '256GB', '512GB'],
  'iPhone 16': ['128GB', '256GB', '512GB'],
  'iPhone 16e': ['128GB', '256GB', '512GB'],
  'iPhone 15 Pro Max': ['256GB', '512GB', '1TB'],
  'iPhone 15 Pro': ['128GB', '256GB', '512GB', '1TB'],
  'iPhone 15 Plus': ['128GB', '256GB', '512GB'],
  'iPhone 15': ['128GB', '256GB', '512GB'],
  'iPhone 14 Pro Max': ['128GB', '256GB', '512GB', '1TB'],
  'iPhone 14 Pro': ['128GB', '256GB', '512GB', '1TB'],
  'iPhone 14 Plus': ['128GB', '256GB', '512GB'],
  'iPhone 14': ['128GB', '256GB', '512GB'],
  'iPhone 13 Pro Max': ['128GB', '256GB', '512GB', '1TB'],
  'iPhone 13 Pro': ['128GB', '256GB', '512GB', '1TB'],
  'iPhone 13': ['128GB', '256GB', '512GB'],
  'iPhone 13 mini': ['128GB', '256GB', '512GB'],
  'iPhone 12 Pro Max': ['128GB', '256GB', '512GB'],
  'iPhone 12 Pro': ['128GB', '256GB', '512GB'],
  'iPhone 12': ['64GB', '128GB', '256GB'],
  'iPhone 12 mini': ['64GB', '128GB', '256GB'],
  'iPhone 11 Pro Max': ['64GB', '256GB', '512GB'],
  'iPhone 11 Pro': ['64GB', '256GB', '512GB'],
  'iPhone 11': ['64GB', '128GB', '256GB'],
  'Apple Watch Ultra 3': ['49mm'],
  'Apple Watch Ultra 2': ['49mm'],
  'Apple Watch Ultra (1.ª gen)': ['49mm'],
  'Apple Watch Series 11': ['42mm', '46mm'],
  'Apple Watch Series 10': ['42mm', '46mm'],
  'Apple Watch Series 9': ['41mm', '45mm'],
  'Apple Watch Series 8': ['41mm', '45mm'],
  'Apple Watch Series 7': ['41mm', '45mm'],
  'Apple Watch Series 6': ['40mm', '44mm'],
  'Apple Watch Series 5': ['40mm', '44mm'],
  'Apple Watch Series 4': ['40mm', '44mm'],
  'Apple Watch Series 3': ['38mm', '42mm'],
  'Apple Watch Series 2': ['38mm', '42mm'],
  'Apple Watch Series 1': ['38mm', '42mm'],
  'Apple Watch (1.ª gen)': ['38mm', '42mm'],
  'Apple Watch SE (3.ª gen)': ['40mm', '44mm'],
  'Apple Watch SE (2.ª gen)': ['40mm', '44mm'],
  'Apple Watch SE (1.ª gen)': ['40mm', '44mm'],
};

export const COLORS: Record<string, string[]> = {
  'iPhone 18 Pro Max': ['Negro', 'Plata', 'Glaciar', 'Bordó'],
  'iPhone 18 Pro': ['Negro', 'Plata', 'Glaciar', 'Bordó'],
  'iPhone Duo': ['Blanco Estelar', 'Cielo Nocturno'],
  'iPhone 17 Pro Max': ['Titanio Plata', 'Titanio Blanco', 'Azul Oscuro', 'Gris Titanio', 'Orange / Cosmic Orange'],
  'iPhone 17 Pro': ['Titanio Plata', 'Titanio Blanco', 'Azul Oscuro', 'Gris Titanio', 'Orange / Cosmic Orange'],
  'iPhone 17 Air': ['Negro', 'Blanco / Plata', 'Azul Claro', 'Dorado Claro'],
  'iPhone 17': ['Negro', 'Blanco', 'Lavanda', 'Azul Neblina', 'Verde Salvia'],
  'iPhone 16 Pro Max': ['Titanio Negro', 'Titanio Blanco', 'Titanio Natural', 'Titanio Desierto'],
  'iPhone 16 Pro': ['Titanio Negro', 'Titanio Blanco', 'Titanio Natural', 'Titanio Desierto'],
  'iPhone 16 Plus': ['Negro', 'Blanco', 'Rosa', 'Verde Azulado (Teal)', 'Azul Ultramar'],
  'iPhone 16': ['Negro', 'Blanco', 'Rosa', 'Verde Azulado (Teal)', 'Azul Ultramar'],
  'iPhone 16e': ['Negro', 'Blanco'],
  'iPhone 15 Pro Max': ['Titanio Negro', 'Titanio Blanco', 'Titanio Azul', 'Titanio Natural'],
  'iPhone 15 Pro': ['Titanio Negro', 'Titanio Blanco', 'Titanio Azul', 'Titanio Natural'],
  'iPhone 15 Plus': ['Negro', 'Azul', 'Verde', 'Amarillo', 'Rosa'],
  'iPhone 15': ['Negro', 'Azul', 'Verde', 'Amarillo', 'Rosa'],
  'iPhone 14 Pro Max': ['Negro Espacial', 'Plata', 'Oro', 'Morado Oscuro'],
  'iPhone 14 Pro': ['Negro Espacial', 'Plata', 'Oro', 'Morado Oscuro'],
  'iPhone 14 Plus': ['Medianoche', 'Blanco Estelar', 'Azul', 'Morado', 'Amarillo', 'Rojo'],
  'iPhone 14': ['Medianoche', 'Blanco Estelar', 'Azul', 'Morado', 'Amarillo', 'Rojo'],
  'iPhone 13 Pro Max': ['Grafito', 'Plata', 'Oro', 'Azul Sierra', 'Verde Alpino'],
  'iPhone 13 Pro': ['Grafito', 'Plata', 'Oro', 'Azul Sierra', 'Verde Alpino'],
  'iPhone 13': ['Medianoche', 'Blanco Estrella', 'Azul', 'Rosa', 'Verde', 'Rojo'],
  'iPhone 13 mini': ['Medianoche', 'Blanco Estrella', 'Azul', 'Rosa', 'Verde', 'Rojo'],
  'iPhone 12 Pro Max': ['Grafito', 'Plata', 'Oro', 'Azul Pacífico'],
  'iPhone 12 Pro': ['Grafito', 'Plata', 'Oro', 'Azul Pacífico'],
  'iPhone 12': ['Negro', 'Blanco', 'Azul', 'Verde', 'Morado', 'Rojo'],
  'iPhone 12 mini': ['Negro', 'Blanco', 'Azul', 'Verde', 'Morado', 'Rojo'],
  'iPhone 11 Pro Max': ['Gris Espacial', 'Plata', 'Oro', 'Verde Medianoche'],
  'iPhone 11 Pro': ['Gris Espacial', 'Plata', 'Oro', 'Verde Medianoche'],
  'iPhone 11': ['Negro', 'Blanco', 'Verde', 'Amarillo', 'Morado', 'Rojo'],
  'Apple Watch Ultra 3': ['Titanio Natural', 'Titanio Negro', 'Titanio Blanco'],
  'Apple Watch Ultra 2': ['Titanio Natural', 'Titanio Negro', 'Titanio Blanco'],
  'Apple Watch Ultra (1.ª gen)': ['Titanio Natural'],
  'Apple Watch Series 11': ['Aluminio Negro Jet', 'Aluminio Plata', 'Aluminio Oro Rosa', 'Acero Inoxidable Plata', 'Acero Inoxidable Oro', 'Acero Inoxidable Negro'],
  'Apple Watch Series 10': ['Aluminio Negro Jet', 'Aluminio Plata', 'Aluminio Oro Rosa', 'Acero Inoxidable Plata', 'Acero Inoxidable Oro'],
  'Apple Watch Series 9': ['Aluminio Medianoche', 'Aluminio Blanco Estelar', 'Aluminio Plata', 'Aluminio Rojo', 'Aluminio Rosa', 'Acero Inoxidable Plata', 'Acero Inoxidable Oro', 'Acero Inoxidable Grafito'],
  'Apple Watch Series 8': ['Aluminio Medianoche', 'Aluminio Blanco Estelar', 'Aluminio Plata', 'Aluminio Rojo', 'Acero Inoxidable Plata', 'Acero Inoxidable Oro', 'Acero Inoxidable Grafito'],
  'Apple Watch Series 7': ['Aluminio Medianoche', 'Aluminio Blanco Estelar', 'Aluminio Verde', 'Aluminio Azul', 'Aluminio Rojo', 'Acero Inoxidable Plata', 'Acero Inoxidable Oro', 'Acero Inoxidable Grafito'],
  'Apple Watch Series 6': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Aluminio Oro', 'Aluminio Azul', 'Aluminio Rojo', 'Acero Inoxidable Plata', 'Acero Inoxidable Grafito', 'Titanio'],
  'Apple Watch Series 5': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Aluminio Oro', 'Acero Inoxidable Plata', 'Acero Inoxidable Grafito', 'Titanio'],
  'Apple Watch Series 4': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Aluminio Oro', 'Acero Inoxidable Plata', 'Acero Inoxidable Grafito'],
  'Apple Watch Series 3': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Aluminio Oro', 'Acero Inoxidable Plata'],
  'Apple Watch Series 2': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Aluminio Oro', 'Acero Inoxidable Plata'],
  'Apple Watch Series 1': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Acero Inoxidable Plata'],
  'Apple Watch (1.ª gen)': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Acero Inoxidable Plata', 'Acero Inoxidable Oro'],
  'Apple Watch SE (3.ª gen)': ['Aluminio Medianoche', 'Aluminio Blanco Estelar', 'Aluminio Plata'],
  'Apple Watch SE (2.ª gen)': ['Aluminio Medianoche', 'Aluminio Blanco Estelar', 'Aluminio Plata'],
  'Apple Watch SE (1.ª gen)': ['Aluminio Gris Espacial', 'Aluminio Plata', 'Aluminio Oro'],
  Apple: ['Space Gray', 'Silver', 'Gold', 'Rose Gold', 'Black', 'Jet Black', 'Red'],
  Samsung: [
    'Titanium Black', 'Titanium Gray', 'Titanium Violet', 'Titanium Blue', 'Titanium Silver Blue',
    'Phantom Black', 'Cream', 'Violet', 'Blue', 'Lime', 'Onyx Black', 'Marble Gray'
  ],
  Xiaomi: [
    'Negro', 'Blanco', 'Gris', 'Azul', 'Verde', 'Plata',
    'Midnight Black', 'Polar White', 'Alpine White', 'Ocean Blue'
  ],
  Motorola: [
    'Negro', 'Blanco', 'Gris', 'Midnight Blue', 'Viva Magenta', 'Koala Gray'
  ],
  POCO: ['Negro', 'Amarillo', 'Azul', 'Gris', 'Blanco']
};

export const EAN_DB: Record<string, any> = {
  '195949820908': {"brand":"Apple","model":"iPhone 16","storage":"128GB","color":"Black"},
  '195949820976': {"brand":"Apple","model":"iPhone 16","storage":"256GB","color":"Black"},
  '195949821041': {"brand":"Apple","model":"iPhone 16","storage":"512GB","color":"Black"},
  '195949821119': {"brand":"Apple","model":"iPhone 16","storage":"128GB","color":"White"},
  '195949821187': {"brand":"Apple","model":"iPhone 16","storage":"256GB","color":"White"},
  '195949821256': {"brand":"Apple","model":"iPhone 16","storage":"512GB","color":"White"},
  '195949821324': {"brand":"Apple","model":"iPhone 16","storage":"128GB","color":"Pink"},
  '195949821393': {"brand":"Apple","model":"iPhone 16","storage":"256GB","color":"Pink"},
  '195949821461': {"brand":"Apple","model":"iPhone 16","storage":"512GB","color":"Pink"},
  '195949821539': {"brand":"Apple","model":"iPhone 16","storage":"128GB","color":"Teal"},
  '195949821607': {"brand":"Apple","model":"iPhone 16","storage":"256GB","color":"Teal"},
  '195949821676': {"brand":"Apple","model":"iPhone 16","storage":"512GB","color":"Teal"},
  '195949821744': {"brand":"Apple","model":"iPhone 16","storage":"128GB","color":"Ultramarine"},
  '195949821812': {"brand":"Apple","model":"iPhone 16","storage":"256GB","color":"Ultramarine"},
  '195949821881': {"brand":"Apple","model":"iPhone 16","storage":"512GB","color":"Ultramarine"},
  '195949802508': {"brand":"Apple","model":"iPhone 16 Pro","storage":"128GB","color":"Black Titanium"},
  '195949802577': {"brand":"Apple","model":"iPhone 16 Pro","storage":"256GB","color":"Black Titanium"},
  '195949802645': {"brand":"Apple","model":"iPhone 16 Pro","storage":"512GB","color":"Black Titanium"},
  '195949802713': {"brand":"Apple","model":"iPhone 16 Pro","storage":"1TB","color":"Black Titanium"},
  '195949802782': {"brand":"Apple","model":"iPhone 16 Pro","storage":"128GB","color":"White Titanium"},
  '195949802850': {"brand":"Apple","model":"iPhone 16 Pro","storage":"256GB","color":"White Titanium"},
  '195949802928': {"brand":"Apple","model":"iPhone 16 Pro","storage":"512GB","color":"White Titanium"},
  '195949802997': {"brand":"Apple","model":"iPhone 16 Pro","storage":"1TB","color":"White Titanium"},
  '195949803055': {"brand":"Apple","model":"iPhone 16 Pro","storage":"128GB","color":"Natural Titanium"},
  '195949803123': {"brand":"Apple","model":"iPhone 16 Pro","storage":"256GB","color":"Natural Titanium"},
  '195949803192': {"brand":"Apple","model":"iPhone 16 Pro","storage":"512GB","color":"Natural Titanium"},
  '195949803260': {"brand":"Apple","model":"iPhone 16 Pro","storage":"1TB","color":"Natural Titanium"},
  '195949803338': {"brand":"Apple","model":"iPhone 16 Pro","storage":"128GB","color":"Desert Titanium"},
  '195949803406': {"brand":"Apple","model":"iPhone 16 Pro","storage":"256GB","color":"Desert Titanium"},
  '195949803475': {"brand":"Apple","model":"iPhone 16 Pro","storage":"512GB","color":"Desert Titanium"},
  '195949803543': {"brand":"Apple","model":"iPhone 16 Pro","storage":"1TB","color":"Desert Titanium"},
  '195949805042': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"256GB","color":"Black Titanium"},
  '195949805110': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"512GB","color":"Black Titanium"},
  '195949805196': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"1TB","color":"Black Titanium"},
  '195949805264': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"256GB","color":"White Titanium"},
  '195949805332': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"512GB","color":"White Titanium"},
  '195949805417': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"1TB","color":"White Titanium"},
  '195949805486': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"256GB","color":"Natural Titanium"},
  '195949805554': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"512GB","color":"Natural Titanium"},
  '195949805639': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"1TB","color":"Natural Titanium"},
  '195949805707': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"256GB","color":"Desert Titanium"},
  '195949805776': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"512GB","color":"Desert Titanium"},
  '195949805851': {"brand":"Apple","model":"iPhone 16 Pro Max","storage":"1TB","color":"Desert Titanium"},
  '195949036542': {"brand":"Apple","model":"iPhone 15","storage":"128GB","color":"Black"},
  '195949036603': {"brand":"Apple","model":"iPhone 15","storage":"256GB","color":"Black"},
  '195949036672': {"brand":"Apple","model":"iPhone 15","storage":"512GB","color":"Black"},
  '195949036733': {"brand":"Apple","model":"iPhone 15","storage":"128GB","color":"Blue"},
  '195949036795': {"brand":"Apple","model":"iPhone 15","storage":"256GB","color":"Blue"},
  '195949036863': {"brand":"Apple","model":"iPhone 15","storage":"512GB","color":"Blue"},
  '195949036924': {"brand":"Apple","model":"iPhone 15","storage":"128GB","color":"Green"},
  '195949036986': {"brand":"Apple","model":"iPhone 15","storage":"256GB","color":"Green"},
  '195949037044': {"brand":"Apple","model":"iPhone 15","storage":"512GB","color":"Green"},
  '195949037105': {"brand":"Apple","model":"iPhone 15","storage":"128GB","color":"Yellow"},
  '195949037167': {"brand":"Apple","model":"iPhone 15","storage":"256GB","color":"Yellow"},
  '195949037235': {"brand":"Apple","model":"iPhone 15","storage":"512GB","color":"Yellow"},
  '195949037297': {"brand":"Apple","model":"iPhone 15","storage":"128GB","color":"Pink"},
  '195949037358': {"brand":"Apple","model":"iPhone 15","storage":"256GB","color":"Pink"},
  '195949037426': {"brand":"Apple","model":"iPhone 15","storage":"512GB","color":"Pink"},
  '195949019050': {"brand":"Apple","model":"iPhone 15 Pro","storage":"128GB","color":"Black Titanium"},
  '195949019111': {"brand":"Apple","model":"iPhone 15 Pro","storage":"256GB","color":"Black Titanium"},
  '195949019180': {"brand":"Apple","model":"iPhone 15 Pro","storage":"512GB","color":"Black Titanium"},
  '195949019258': {"brand":"Apple","model":"iPhone 15 Pro","storage":"1TB","color":"Black Titanium"},
  '195949019319': {"brand":"Apple","model":"iPhone 15 Pro","storage":"128GB","color":"White Titanium"},
  '195949019371': {"brand":"Apple","model":"iPhone 15 Pro","storage":"256GB","color":"White Titanium"},
  '195949019449': {"brand":"Apple","model":"iPhone 15 Pro","storage":"512GB","color":"White Titanium"},
  '195949019517': {"brand":"Apple","model":"iPhone 15 Pro","storage":"1TB","color":"White Titanium"},
  '195949019579': {"brand":"Apple","model":"iPhone 15 Pro","storage":"128GB","color":"Blue Titanium"},
  '195949019630': {"brand":"Apple","model":"iPhone 15 Pro","storage":"256GB","color":"Blue Titanium"},
  '195949019708': {"brand":"Apple","model":"iPhone 15 Pro","storage":"512GB","color":"Blue Titanium"},
  '195949019777': {"brand":"Apple","model":"iPhone 15 Pro","storage":"1TB","color":"Blue Titanium"},
  '195949019838': {"brand":"Apple","model":"iPhone 15 Pro","storage":"128GB","color":"Natural Titanium"},
  '195949019890': {"brand":"Apple","model":"iPhone 15 Pro","storage":"256GB","color":"Natural Titanium"},
  '195949019968': {"brand":"Apple","model":"iPhone 15 Pro","storage":"512GB","color":"Natural Titanium"},
  '195949020018': {"brand":"Apple","model":"iPhone 15 Pro","storage":"1TB","color":"Natural Titanium"},
  '195949045950': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"256GB","color":"Black Titanium"},
  '195949046018': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"512GB","color":"Black Titanium"},
  '195949046094': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"1TB","color":"Black Titanium"},
  '195949045981': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"256GB","color":"White Titanium"},
  '195949046049': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"512GB","color":"White Titanium"},
  '195949046124': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"1TB","color":"White Titanium"},
  '195949046001': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"256GB","color":"Blue Titanium"},
  '195949046063': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"512GB","color":"Blue Titanium"},
  '195949046148': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"1TB","color":"Blue Titanium"},
  '195949048531': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"256GB","color":"Natural Titanium"},
  '195949048609': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"512GB","color":"Natural Titanium"},
  '195949048685': {"brand":"Apple","model":"iPhone 15 Pro Max","storage":"1TB","color":"Natural Titanium"},
  '194253408253': {"brand":"Apple","model":"iPhone 14","storage":"128GB","color":"Midnight"},
  '194253409250': {"brand":"Apple","model":"iPhone 14","storage":"256GB","color":"Midnight"},
  '194253408482': {"brand":"Apple","model":"iPhone 14","storage":"128GB","color":"Starlight"},
  '194253409489': {"brand":"Apple","model":"iPhone 14","storage":"256GB","color":"Starlight"},
  '194253408710': {"brand":"Apple","model":"iPhone 14","storage":"128GB","color":"Blue"},
  '194253409717': {"brand":"Apple","model":"iPhone 14","storage":"256GB","color":"Blue"},
  '194253408949': {"brand":"Apple","model":"iPhone 14","storage":"128GB","color":"Purple"},
  '194253409175': {"brand":"Apple","model":"iPhone 14","storage":"128GB","color":"(PRODUCT)RED"},
  '194253401063': {"brand":"Apple","model":"iPhone 14 Pro","storage":"128GB","color":"Space Black"},
  '194253401292': {"brand":"Apple","model":"iPhone 14 Pro","storage":"256GB","color":"Space Black"},
  '194253401520': {"brand":"Apple","model":"iPhone 14 Pro","storage":"512GB","color":"Space Black"},
  '194253401759': {"brand":"Apple","model":"iPhone 14 Pro","storage":"1TB","color":"Space Black"},
  '194253401988': {"brand":"Apple","model":"iPhone 14 Pro","storage":"128GB","color":"Silver"},
  '194253402213': {"brand":"Apple","model":"iPhone 14 Pro","storage":"256GB","color":"Silver"},
  '194253402442': {"brand":"Apple","model":"iPhone 14 Pro","storage":"512GB","color":"Silver"},
  '194253402671': {"brand":"Apple","model":"iPhone 14 Pro","storage":"1TB","color":"Silver"},
  '194253402909': {"brand":"Apple","model":"iPhone 14 Pro","storage":"128GB","color":"Gold"},
  '194253403128': {"brand":"Apple","model":"iPhone 14 Pro","storage":"256GB","color":"Gold"},
  '194253403357': {"brand":"Apple","model":"iPhone 14 Pro","storage":"512GB","color":"Gold"},
  '194253403586': {"brand":"Apple","model":"iPhone 14 Pro","storage":"1TB","color":"Gold"},
  '194253403814': {"brand":"Apple","model":"iPhone 14 Pro","storage":"128GB","color":"Deep Purple"},
  '194253404033': {"brand":"Apple","model":"iPhone 14 Pro","storage":"256GB","color":"Deep Purple"},
  '194253404262': {"brand":"Apple","model":"iPhone 14 Pro","storage":"512GB","color":"Deep Purple"},
  '194253404491': {"brand":"Apple","model":"iPhone 14 Pro","storage":"1TB","color":"Deep Purple"},
  '194253379942': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"128GB","color":"Space Black"},
  '194253380863': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"256GB","color":"Space Black"},
  '194253381785': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"512GB","color":"Space Black"},
  '194253382935': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"1TB","color":"Space Black"},
  '194253380177': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"128GB","color":"Silver"},
  '194253381099': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"256GB","color":"Silver"},
  '194253382010': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"512GB","color":"Silver"},
  '194253383161': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"1TB","color":"Silver"},
  '194253380405': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"128GB","color":"Gold"},
  '194253381327': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"256GB","color":"Gold"},
  '194253382249': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"512GB","color":"Gold"},
  '194253383390': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"1TB","color":"Gold"},
  '194253380634': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"128GB","color":"Deep Purple"},
  '194253381556': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"256GB","color":"Deep Purple"},
  '194253382478': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"512GB","color":"Deep Purple"},
  '194253383628': {"brand":"Apple","model":"iPhone 14 Pro Max","storage":"1TB","color":"Deep Purple"},
  '194252786239': {"brand":"Apple","model":"iPhone 13","storage":"128GB","color":"Midnight"},
  '194252786314': {"brand":"Apple","model":"iPhone 13","storage":"128GB","color":"Starlight"},
  '194252786291': {"brand":"Apple","model":"iPhone 13","storage":"128GB","color":"Blue"},
  '194252786307': {"brand":"Apple","model":"iPhone 13","storage":"128GB","color":"Pink"},
  '194252786321': {"brand":"Apple","model":"iPhone 13","storage":"128GB","color":"(PRODUCT)RED"},
  '190199220367': {"brand":"Apple","model":"iPhone 11","storage":"64GB","color":"Black"},
  '190199220510': {"brand":"Apple","model":"iPhone 11","storage":"64GB","color":"White"},
  '194252037101': {"brand":"Apple","model":"iPhone 11","storage":"64GB","color":"Yellow"},
  '194252031147': {"brand":"Apple","model":"iPhone 12","storage":"64GB","color":"Black"},
  '194252031260': {"brand":"Apple","model":"iPhone 12","storage":"64GB","color":"White"},
  '194252031383': {"brand":"Apple","model":"iPhone 12","storage":"64GB","color":"Blue"},
  '194252031406': {"brand":"Apple","model":"iPhone 12","storage":"64GB","color":"Pink"},
  '194252031420': {"brand":"Apple","model":"iPhone 12","storage":"64GB","color":"(PRODUCT)RED"},
  '194252796238': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"64GB","color":"Midnight"},
  '194252796337': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"128GB","color":"Midnight"},
  '194252796368': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"256GB","color":"Midnight"},
  '194252796313': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"64GB","color":"Starlight"},
  '194252796344': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"128GB","color":"Starlight"},
  '194252796375': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"256GB","color":"Starlight"},
  '194252796320': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"64GB","color":"(PRODUCT)RED"},
  '194252796351': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"128GB","color":"(PRODUCT)RED"},
  '194252796382': {"brand":"Apple","model":"iPhone SE (3rd Gen)","storage":"256GB","color":"(PRODUCT)RED"},
  // Samsung & Otros
  '8806095307212': { brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '256GB', color: 'Titanium Black' },
  '8806095307229': { brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '256GB', color: 'Titanium Gray' },
  '8806095307236': { brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '256GB', color: 'Titanium Violet' },
  '8806095293218': { brand: 'Samsung', model: 'Galaxy S24+', storage: '256GB', color: 'Onyx Black' },
  '8806095293225': { brand: 'Samsung', model: 'Galaxy S24', storage: '128GB', color: 'Marble Gray' },
  '8806094701233': { brand: 'Samsung', model: 'Galaxy S23 Ultra', storage: '256GB', color: 'Phantom Black' },
  '8806094701240': { brand: 'Samsung', model: 'Galaxy S23+', storage: '256GB', color: 'Cream' },
  '8806094895666': { brand: 'Samsung', model: 'Galaxy A54', storage: '128GB', color: 'Awesome Lime' },
  '8806094895673': { brand: 'Samsung', model: 'Galaxy A54', storage: '128GB', color: 'Awesome Graphite' },
  '8806094895680': { brand: 'Samsung', model: 'Galaxy A34', storage: '128GB', color: 'Awesome Silver' },
  '8806094895697': { brand: 'Samsung', model: 'Galaxy A14', storage: '64GB', color: 'Black' },
};

export const PAY = [
  { id: 'ars_cash', label: '$ Efectivo', cur: 'ARS' },
  { id: 'usd_cash', label: 'U$ Billete', cur: 'USD' },
  { id: 'ars_transf', label: 'Transf. ARS', cur: 'ARS' },
  { id: 'usd_transf', label: 'Transf. USD', cur: 'USD' },
  { id: 'usdt', label: 'USDT', cur: 'USD' },
  /* La tarjeta cobra en pesos. El recargo del plan se resuelve aparte: lo
     que cubre de la venta y lo que acredita en la caja no son el mismo
     número. Ver src/utils/tarjetas.ts. */
  { id: 'tarjeta', label: 'Tarjeta', cur: 'ARS' },
  { id: 'tradein', label: 'Parte de Pago', cur: 'ANY' }
];

export const IS = [];
export const ISL = [];
