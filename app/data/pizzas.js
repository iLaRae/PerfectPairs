// /data/pizzas.js
// Put images in: /public/pizzas/<file>.jpg (or .png) and update paths below as needed.

const PIZZAS = [
  {
    name: "The Baked Potato Pie",
    subtitle: "LIMITED TIME ONLY",
    description:
      "Crafted with a tangy sour cream base, topped with grated pepper jack and mozzarella cheeses, thinly sliced potatoes, minced garlic, crumbled bacon, fresh rosemary and finished with parmesan and chives. Created exclusively for Sgt. Pepperoni's by Stan Frazier.",
    base: "Sour cream",
    limited: true,
    tags: ["Rich", "Herby"],
    group: "Specialty",
    image: "/pizzas/Baked-Potato-Pie-300x300.jpeg",
    alt: "The Baked Potato Pie topped with potatoes, bacon, and chives",
  },
  {
    name: "Pepperoni",
    description:
      "Made with a marinara base, this is a classic pepperoni pie using our special “roni cups.”",
    base: "Marinara",
    tags: ["Classic"],
    group: "Specialty",
    image: "/pizzas/pepperoni.jpg",
    alt: "Classic pepperoni pizza with crispy roni cups",
  },
  {
    name: "Cheese",
    description:
      "Our version of the classic cheese pie. Marinara sauce and pizza dough made fresh daily.",
    base: "Marinara",
    tags: ["Classic", "Vegetarian"],
    group: "Specialty",
    image: "/pizzas/cheese.jpg",
    alt: "Cheese pizza with golden, bubbly mozzarella",
  },
  {
    name: "The Works",
    description:
      "Made with a marinara base, layered with mozzarella, pepperoni, bell pepper, onion, mushroom, black olives, garlic, Italian sausage, and our famous meatballs.",
    base: "Marinara",
    tags: ["Everything"],
    group: "Specialty",
    image: "/pizzas/the-works.jpg",
    alt: "Fully loaded pizza with meats and veggies",
  },
  {
    name: "Meatball Ricotta",
    description:
      "Made without a sauce base, but includes Stan's famous meatballs along with sweet New York ricotta, fresh garlic and mozzarella topped off with marinara sauce dollops.",
    base: "No base (marinara dollops)",
    tags: ["Ricotta"],
    group: "Specialty",
    image: "/pizzas/meatball-ricotta.jpg",
    alt: "Meatball and ricotta pizza with marinara dollops",
  },
  {
    name: "Bronx Bomber",
    description:
      "Made with pepperoni, sausage, mushroom, jalapeño, and garlic with a marinara base.",
    base: "Marinara",
    tags: ["Spicy"],
    group: "Specialty",
    image: "/pizzas/bronx-bomber.jpg",
    alt: "Spicy Bronx Bomber pizza with jalapeños",
  },
  {
    name: "BBQ Chicken",
    description:
      "Made with chicken breast, red onion, cilantro, and mozzarella with a barbecue sauce base and a barbecue sauce drizzle on.",
    base: "BBQ",
    tags: ["Sweet & Smoky"],
    group: "Specialty",
    image: "/pizzas/bbq-chicken.jpg",
    alt: "BBQ chicken pizza with red onion and cilantro",
  },
  {
    name: "Margherita",
    description:
      "Made without a sauce base, but layered with fresh mozzarella, roma tomatoes, basil, and garlic.",
    base: "No base",
    tags: ["Vegetarian", "Fresh"],
    group: "Specialty",
    image: "/pizzas/margherita.jpg",
    alt: "Margherita pizza with tomato, basil, and mozzarella",
  },
  {
    name: "Super Bee",
    description:
      "Crafted with a rich crème fraiche base, premium mozzarella, crispy bacon, creamy ricotta, fresh garlic, and a zesty kick of Frank’s RedHot, finished with clover honey drizzle and chopped parsley. Created by Stan Frazier exclusively for Sgt. Pepperoni’s.",
    base: "Crème fraiche",
    tags: ["Sweet Heat"],
    group: "Specialty",
    image: "/pizzas/Super-Bee.webp",
    alt: "Super Bee pizza with honey drizzle and parsley",
  },
  {
    name: "Hawaii Five-O",
    description:
      "Made without a sauce base, but layered with mozzarella, pepperoni, pineapple, sweet NY ricotta, fresh garlic and spicy jalapeño.",
    base: "No base",
    tags: ["Sweet & Spicy"],
    group: "Specialty",
    image: "/pizzas/hawaii-five-o.jpg",
    alt: "Hawaiian-style pizza with pineapple and jalapeño",
  },
  {
    name: "Meat Pizza",
    description:
      "Made with a marinara base, mozzarella, pepperoni, Italian sausage, bacon, and of course Stan's famous meatballs!",
    base: "Marinara",
    tags: ["Hearty"],
    group: "Specialty",
    image: "/pizzas/MEAT.jpg",
    alt: "Meat lovers pizza with pepperoni, sausage, and bacon",
  },
  {
    name: "Grandmas Pie",
    description:
      "New York style square pie with mozzarella, marinara, and fresh basil.",
    base: "Marinara",
    tags: ["Square", "Classic"],
    group: "Specialty",
    image: "/pizzas/grandmas-pie.jpg",
    alt: "Square grandma-style pizza with basil",
  },
  {
    name: "Veggie",
    description:
      "Made with a marinara base, layered with mozzarella, spinach, tomato, broccoli, mushroom, black olives, and garlic.",
    base: "Marinara",
    tags: ["Vegetarian"],
    group: "Specialty",
    image: "/pizzas/veggie.jpg",
    alt: "Vegetable pizza with spinach, tomato, and mushrooms",
  },
  {
    name: "Buffalo Chicken",
    description:
      "Made with a spicy buffalo sauce base, chicken breast and mozzarella. Topped with a spicy buffalo sauce and a ranch drizzle.",
    base: "Buffalo",
    tags: ["Spicy"],
    group: "Specialty",
    image: "/pizzas/buffalo-chicken.jpg",
    alt: "Buffalo chicken pizza with ranch drizzle",
  },
  {
    name: "White Pizza",
    description:
      "Made with a four cheese blend including NY ricotta, mozzarella, parmesan, romano. No sauce as the base.",
    base: "No base",
    tags: ["Four Cheese", "Vegetarian"],
    group: "Specialty",
    image: "/pizzas/white-pizza.jpg",
    alt: "Four-cheese white pizza without tomato sauce",
  },
  // {
  //   name: "14″ Build Your Own Pie",
  //   description: "Build your pizza! (Excludes the Pie of the Month)",
  //   base: "Your choice",
  //   tags: ["Custom"],
  //   group: "Build Your Own",
  //   image: "/pizzas/byo-14.jpg",
  //   alt: "14 inch build-your-own pizza",
  // },
  // {
  //   name: "18″ Build Your Own Pie",
  //   description: "Build your pizza!",
  //   base: "Your choice",
  //   tags: ["Custom"],
  //   group: "Build Your Own",
  //   image: "/pizzas/byo-18.jpg",
  //   alt: "18 inch build-your-own pizza",
  // },
  // {
  //   name: "14″ Half & Half Specialty Pie",
  //   description:
  //     "Select your two favorite specialty pizzas, one on each half! (Excludes the Pie of the Month)",
  //   base: "Split",
  //   tags: ["Half & Half"],
  //   group: "Build Your Own",
  //   image: "/pizzas/half-n-half-14.jpg",
  //   alt: "14 inch half-and-half specialty pizza",
  // },
];

export default PIZZAS;
