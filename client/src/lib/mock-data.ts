import heroMeat from "@/assets/hero-meat.png";
import catLamb from "@/assets/category-lamb.png";
import catBeef from "@/assets/category-beef.png";
import catChicken from "@/assets/category-chicken.png";
import catMinced from "@/assets/category-minced.png";

import catGoat from "@/assets/category-goat.png";

export const categories = [
  { id: 'all', name: 'الكل', icon: '🥩' },
  { id: 'lamb', name: 'لحوم غنم', icon: '🐑', image: catLamb },
  { id: 'goat', name: 'لحم تيس/عنز', icon: '🐐', image: catGoat },
  { id: 'beef', name: 'لحوم عجل', icon: '🐂', image: catBeef },
  { id: 'chicken', name: 'دواجن', icon: '🐔', image: catChicken },
  { id: 'minced', name: 'مفرومات', icon: '🥣', image: catMinced },
];

export const products = [
  {
    id: 1,
    name: "خروف نعيمي كامل",
    category: "lamb",
    price: 1800,
    unit: "حبة",
    image: catLamb,
    description: "خروف نعيمي بلدي طازج، ذبح يومي، وزن يتراوح بين 18-22 كجم. مناسب للولائم.",
    isFeatured: true,
  },
  {
    id: 9,
    name: "تيس عارضي بلدي",
    category: "goat",
    price: 1100,
    unit: "حبة",
    image: catGoat,
    description: "تيس عارضي بلدي طازج، لحم طري جداً وقليل الشحم، ذبح يومي.",
    isFeatured: true,
  },
  {
    id: 2,
    name: "ريش غنم بلدي",
    category: "lamb",
    price: 85,
    unit: "كجم",
    image: catLamb,
    description: "ريش غنم طرية وممتازة للشوي، من أجود أنواع الغنم البلدي.",
    isFeatured: true,
  },
  {
    id: 3,
    name: "ستيك ريب آي (Ribeye)",
    category: "beef",
    price: 120,
    unit: "كجم",
    image: catBeef,
    description: "قطعة ستيك ريب آي فاخرة، تعريق ممتاز، مثالية للستيك هاوس المنزلي.",
    isFeatured: true,
  },
  {
    id: 4,
    name: "دجاج مبرد كامل",
    category: "chicken",
    price: 18,
    unit: "حبة",
    image: catChicken,
    description: "دجاج مبرد طازج يومياً، وزن 1000-1100 جرام.",
    isFeatured: false,
    discount: 10
  },
  {
    id: 5,
    name: "لحم عجل مفروم",
    category: "minced",
    price: 55,
    unit: "كجم",
    image: catMinced,
    description: "لحم عجل بلدي مفروم طازج بدون شحم زائد، مثالي للمكرونة والحشوات.",
    isFeatured: false,
  },
  {
    id: 6,
    name: "أوصال لحم عجل",
    category: "beef",
    price: 65,
    unit: "كجم",
    image: catBeef,
    description: "قطع لحم عجل صافي بدون عظم، ممتازة للإيدامات والمقلقل.",
    isFeatured: false,
  },
  {
    id: 7,
    name: "فخذ خروف كامل",
    category: "lamb",
    price: 320,
    unit: "حبة",
    image: catLamb,
    description: "فخذ خروف نعيمي كامل، مثالي للفرن.",
    isFeatured: false,
  },
  {
    id: 8,
    name: "صدور دجاج فيليه",
    category: "chicken",
    price: 35,
    unit: "كجم",
    image: catChicken,
    description: "صدور دجاج صافية بدون عظم وجلد، طازجة يومياً.",
    isFeatured: true,
  }
];

export const heroImage = heroMeat;
