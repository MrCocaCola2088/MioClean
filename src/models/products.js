/**
 * MioClean Product Catalog
 * Distribuidora de artículos de limpieza
 */

const PRICE_PER_LITER_BS = 15;

const products = [
  {
    id: "MC-001",
    name: "Jabón Líquido 1L",
    nameEn: "Liquid Soap 1L",
    category: "jabones",
    categoryEn: "soaps",
    brand: "Mio Clean",
    price: PRICE_PER_LITER_BS * 1,
    unit: "botella 1L",
    unitEn: "1L bottle",
    sizeL: 1,
    stock: 120,
    description: "Jabón líquido MioClean en presentación de 1 litro.",
    descriptionEn: "MioClean liquid soap in a 1 litre bottle.",
    tags: ["jabón", "jabon", "jabón líquido", "jabon liquido", "detergente", "1l", "1 litro", "botella"],
    image: "/img/producto1L.png",
  },
  {
    id: "MC-004",
    name: "Bidón de 4L",
    nameEn: "4L Drum",
    category: "jabones",
    categoryEn: "soaps",
    brand: "Mio Clean",
    price: PRICE_PER_LITER_BS * 4,
    unit: "bidón 4L",
    unitEn: "4L drum",
    sizeL: 4,
    stock: 80,
    description: "Jabón líquido MioClean en bidón de 4 litros.",
    descriptionEn: "MioClean liquid soap in a 4 litre drum.",
    tags: ["jabón", "jabon", "jabón líquido", "jabon liquido", "bidon", "bidón", "4l", "4 litros"],
    image: "/img/producto4L.png",
  },
  {
    id: "MC-005",
    name: "Bidón de 5L",
    nameEn: "5L Drum",
    category: "jabones",
    categoryEn: "soaps",
    brand: "Mio Clean",
    price: PRICE_PER_LITER_BS * 5,
    unit: "bidón 5L",
    unitEn: "5L drum",
    sizeL: 5,
    stock: 70,
    description: "Jabón líquido MioClean en bidón de 5 litros.",
    descriptionEn: "MioClean liquid soap in a 5 litre drum.",
    tags: ["jabón", "jabon", "jabón líquido", "jabon liquido", "bidon", "bidón", "5l", "5 litros"],
    image: "/img/producto5L.png",
  },
];

const categories = Array.from(
  new Map(products.map((p) => [p.category, { id: p.category, name: p.category, nameEn: p.categoryEn }])).values()
);

module.exports = { products, categories, PRICE_PER_LITER_BS };
