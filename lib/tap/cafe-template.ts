export type CafeItem = {
  name: string;
  nameHi: string;
  pricePaise: number;
  veg: "VEG" | "NON_VEG" | "EGG" | "NONE";
};

export type CafeGroup = {
  category: string;
  categoryHi: string;
  items: CafeItem[];
};

export const CAFE_TEMPLATE: CafeGroup[] = [
  {
    category: "Coffee",
    categoryHi: "कॉफ़ी",
    items: [
      { name: "Cappuccino", nameHi: "कैपुचीनो", pricePaise: 12000, veg: "VEG" },
      { name: "Filter Coffee", nameHi: "फ़िल्टर कॉफ़ी", pricePaise: 8000, veg: "VEG" }
    ]
  },
  {
    category: "Tea",
    categoryHi: "चाय",
    items: [{ name: "Masala Chai", nameHi: "मसाला चाय", pricePaise: 4000, veg: "VEG" }]
  },
  {
    category: "Snacks",
    categoryHi: "स्नैक्स",
    items: [
      { name: "Veg Sandwich", nameHi: "वेज सैंडविच", pricePaise: 9000, veg: "VEG" },
      { name: "Samosa", nameHi: "समोसा", pricePaise: 4000, veg: "VEG" }
    ]
  },
  {
    category: "Desserts",
    categoryHi: "मिठाई",
    items: [{ name: "Brownie", nameHi: "ब्राउनी", pricePaise: 15000, veg: "EGG" }]
  }
];
