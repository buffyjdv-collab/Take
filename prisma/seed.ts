import { db } from '../src/lib/db'

const items = [
  { name: 'Classic Cheeseburger', description: 'Juicy beef patty, melted cheddar, crisp lettuce, vine tomato & toasted sesame bun.', price: 9.5, category: 'Burgers', image: '/food/burger.png', tags: 'bestseller,beef', rating: 4.9, prepTime: 12, popular: true },
  { name: 'Margherita Pizza', description: 'Wood-fired dough, San Marzano tomato, fresh mozzarella & basil.', price: 12.0, category: 'Pizza', image: '/food/pizza.png', tags: 'bestseller,veg', rating: 4.8, prepTime: 18, popular: true },
  { name: 'Salmon Sushi Platter', description: 'Premium salmon nigiri & rolls with wasabi, ginger & soy.', price: 16.5, category: 'Sushi', image: '/food/sushi.png', tags: 'premium,fresh', rating: 4.9, prepTime: 20, popular: true },
  { name: 'Mediterranean Salad', description: 'Garden greens, avocado, chickpeas, feta & cherry tomatoes.', price: 8.5, category: 'Salads', image: '/food/salad.png', tags: 'healthy,veg', rating: 4.7, prepTime: 8 },
  { name: 'Chocolate Lava Cake', description: 'Warm molten-centre cake dusted with cocoa & fresh berries.', price: 6.5, category: 'Desserts', image: '/food/dessert.png', tags: 'sweet,veg', rating: 4.9, prepTime: 10, popular: true },
  { name: 'Artisan Latte', description: 'Double-shot espresso with silky steamed milk & rosetta art.', price: 4.5, category: 'Drinks', image: '/food/coffee.png', tags: 'hot,veg', rating: 4.8, prepTime: 5 },
  { name: 'Carbonara Pasta', description: 'Al dente spaghetti, pancetta, parmesan & cracked black pepper.', price: 11.5, category: 'Pasta', image: '/food/pasta.png', tags: 'creamy,veg', rating: 4.7, prepTime: 16 },
  { name: 'Street Chicken Tacos', description: 'Soft corn tacos, lime-grilled chicken, salsa verde & cilantro.', price: 10.5, category: 'Tacos', image: '/food/tacos.png', tags: 'spicy,bestseller', rating: 4.8, prepTime: 14, popular: true },
  { name: 'Buffalo Wings', description: 'Crispy glazed wings with celery sticks & cool ranch dip.', price: 8.0, category: 'Sides', image: '/food/wings.png', tags: 'spicy,sharing', rating: 4.6, prepTime: 15 },
  { name: 'Loaded Cheese Fries', description: 'Golden fries smothered in cheese, bacon bits & scallions.', price: 6.0, category: 'Sides', image: '/food/fries.png', tags: 'sharing,veg', rating: 4.7, prepTime: 10 },
  { name: 'Strawberry Shake', description: 'Thick strawberry milkshake with whipped cream & a cherry.', price: 5.5, category: 'Drinks', image: '/food/shake.png', tags: 'cold,sweet', rating: 4.8, prepTime: 6 },
  { name: 'Flat White', description: 'Velvety micro-foam over a smooth double ristretto.', price: 4.0, category: 'Drinks', image: '/food/flatwhite.png', tags: 'hot,veg', rating: 4.7, prepTime: 5 },
]

async function main() {
  console.log('Seeding menu items...')
  for (const it of items) {
    await db.menuItem.upsert({
      where: { id: it.name.replace(/\s+/g, '-').toLowerCase() + '-seed' },
      update: {},
      create: {
        ...it,
        id: it.name.replace(/\s+/g, '-').toLowerCase() + '-seed',
      },
    })
  }
  const count = await db.menuItem.count()
  console.log(`Seed complete. ${count} menu items in database.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
