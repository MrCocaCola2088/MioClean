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
=======
    id: "MC-006",
    name: "Cloro Líquido 5L",
    nameEn: "Liquid Bleach 5L",
    category: "desinfectantes",
    categoryEn: "disinfectants",
    brand: "Mio Clean",
    price: 9.99,
    unit: "galón 5L",
    unitEn: "5L gallon",
    sizeL: 5,
    stock: 70,
    description: "Cloro concentrado para desinfección y blanqueo.",
    descriptionEn: "Concentrated bleach for disinfection and whitening.",
    tags: ["cloro", "bleach", "desinfectante", "blanqueador", "5l", "5 litros"],
    image: "https://github.com/user-attachments/assets/242eb95e-b5e0-46db-bdae-47e4c6615c71",
  },
  {
    id: "MC-010",
    name: "Cloro Líquido 10L",
    nameEn: "Liquid Bleach 10L",
    category: "desinfectantes",
    categoryEn: "disinfectants",
    brand: "Mio Clean",
    price: 160,
    unit: "bidón 10L",
    unitEn: "10L container",
    sizeL: 10,
    stock: 40,
    description: "Cloro concentrado en bidón de 10 litros para uso industrial.",
    descriptionEn: "Concentrated bleach in 10-litre container for industrial use.",
    tags: ["cloro", "bleach", "desinfectante", "blanqueador", "10l", "10 litros", "bidon", "industrial"],
    image: "https://github.com/user-attachments/assets/242eb95e-b5e0-46db-bdae-47e4c6615c71",
  },
  {
    id: "MC-007",
    name: "Suavizante de Ropa 1L",
    nameEn: "Fabric Softener 1L",
    category: "lavandería",
    categoryEn: "laundry",
    brand: "Mio Clean",
    price: 3.25,
    unit: "botella 1L",
    unitEn: "1L bottle",
    sizeL: 1,
    stock: 100,
    description: "Suavizante para ropa con fragancia fresca y duradera.",
    descriptionEn: "Fabric softener with fresh long-lasting fragrance.",
    tags: ["suavizante", "ropa", "lavandería", "fabric softener", "1l", "1 litro"],
    image: "https://github.com/user-attachments/assets/a4574855-d9fa-4161-9e85-f3e65b2abcfc",
  },
  {
    id: "MC-008",

const categories = Array.from(
  new Map(products.map((p) => [p.category, { id: p.category, name: p.category, nameEn: p.categoryEn }])).values()
);

module.exports = { products, categories };
