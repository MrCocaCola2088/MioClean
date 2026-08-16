/**
 * MioClean Product Catalog
 * Distribuidora de artículos de limpieza
 */

const products = [
  {
    id: "MC-001",
    name: "Detergente Líquido Lavarropas 3L",
    nameEn: "Laundry Liquid Detergent 3L",
    category: "lavandería",
    categoryEn: "laundry",
    brand: "Mio Clean",
    price: 10.5,
    unit: "envase 3L",
    unitEn: "3L container",
    sizeL: 3,
    stock: 85,
    description: "Jabón + suavizante para ropa blanca, de color y de bebé.",
    descriptionEn: "Soap + softener for white, color and baby clothes.",
    tags: ["detergente", "lavarropas", "jabón", "suavizante", "ropa", "3l", "3 litros"],
    image: "https://github.com/user-attachments/assets/de7ac6b0-55e7-4326-81c7-0043d0034d21",
  },
  {
    id: "MC-002",
    name: "Cloro Líquido 3L",
    nameEn: "Liquid Bleach 3L",
    category: "desinfectantes",
    categoryEn: "disinfectants",
    brand: "Mio Clean",
    price: 6.75,
    unit: "envase 3L",
    unitEn: "3L container",
    sizeL: 3,
    stock: 110,
    description: "Cloro concentrado para desinfección y blanqueo.",
    descriptionEn: "Concentrated bleach for disinfection and whitening.",
    tags: ["cloro", "bleach", "desinfectante", "blanqueador", "3l", "3 litros"],
    image: "https://github.com/user-attachments/assets/242eb95e-b5e0-46db-bdae-47e4c6615c71",
  },
  {
    id: "MC-003",
    name: "Suavizante de Ropa 3L",
    nameEn: "Fabric Softener 3L",
    category: "lavandería",
    categoryEn: "laundry",
    brand: "Mio Clean",
    price: 8.5,
    unit: "envase 3L",
    unitEn: "3L container",
    sizeL: 3,
    stock: 90,
    description: "Suavizante para ropa con fragancia fresca y duradera.",
    descriptionEn: "Fabric softener with fresh long-lasting fragrance.",
    tags: ["suavizante", "ropa", "lavandería", "fabric softener", "3l", "3 litros"],
    image: "https://github.com/user-attachments/assets/a4574855-d9fa-4161-9e85-f3e65b2abcfc",
  },
];

const categories = Array.from(
  new Map(products.map((p) => [p.category, { id: p.category, name: p.category, nameEn: p.categoryEn }])).values()
);

module.exports = { products, categories };
