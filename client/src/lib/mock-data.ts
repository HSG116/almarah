export const categories = [
  { id: 'all', name: 'الكل', icon: '🥩' },
  { id: 'lamb', name: 'الذبائح البلدية', icon: '🐑', image: '/images/naimi.jpg' },
  { id: 'kilo', name: 'لحم بالكيلو', icon: '⚖️', image: '/images/meat-by-kilo.jpg' },
  { id: 'veggies', name: 'خضروات وفواكه', icon: '🍎', image: '/images/veggies.jpg' },
  { id: 'kashta', name: 'كشتة ولحم', icon: '⛺', image: '/images/kashta.jpg' },
];

export const products = [
  {
    id: 1,
    name: "خروف نعيمي بلدي كامل",
    category: "lamb",
    price: 1850,
    unit: "ذبيحة",
    image: "/images/naimi.jpg",
    description: "نعيمي بلدي من مزارعنا، تربية خاصة، ذبح يومي تحت إشراف طبي. يشمل التقطيع والتغليف حسب رغبتك.",
    isFeatured: true,
  },
  {
    id: 10,
    name: "بوكس الشواء المتكامل (كشتة)",
    category: "kashta",
    price: 450,
    unit: "بوكس",
    image: "/images/kashta.jpg",
    description: "كل ما تحتاجه لرحلتك: 3 كيلو لحم مشكل، خضروات طازجة، عصائر باردة، وفحم. جاهز للانطلاق!",
    isFeatured: true,
  },
  {
    id: 11,
    name: "عرض النعيمي الملكي (بكس)",
    category: "lamb",
    price: 950,
    unit: "بكس",
    image: "/images/naimi-box.jpg",
    description: "نصف ذبيحة نعيمي مع بوكس خضروات مشكلة، بهارات الملحمة الخاصة، وصوصات التتبيل.",
    isFeatured: true,
  },
  {
    id: 2,
    name: "ريش غنم نعيمي بلدي",
    category: "kilo",
    price: 95,
    unit: "كجم",
    image: "/images/meat-by-kilo.jpg",
    description: "ريش نعيمي طرية جداً، دهن خفيف، مثالية للشوي السريع.",
    isFeatured: true,
  },
  {
    id: 3,
    name: "أوصال حاشي لباني",
    category: "kilo",
    price: 65,
    unit: "كجم",
    image: "/images/meat-by-kilo.jpg",
    description: "لحم حاشي صغير السن، وردي اللون، سريع الاستواء ومثالي للمقلقل.",
    isFeatured: false,
  },
  {
    id: 12,
    name: "سلة الفواكه الموسمية",
    category: "veggies",
    price: 85,
    unit: "سلة",
    image: "/images/veggies.jpg",
    description: "تشكيلة مختارة من أجود الفواكه الطازجة (تفاح، برتقال، موز، عنب) حسب الموسم.",
    isFeatured: false,
  },
  {
    id: 13,
    name: "صندوق الخضار اليومي",
    category: "veggies",
    price: 55,
    unit: "صندوق",
    image: "/images/veggies.jpg",
    description: "خضروات أساسية طازجة: طماطم، خيار، كوسة، باذنجان، فلفل بارد. قطاف اليوم.",
    isFeatured: false,
  },
];

export const heroImage = "/images/naimi.jpg";
