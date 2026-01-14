// Script to seed admin accounts
// Run this with: node seed-admins.js

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const admins = [
  {
    email: 'ask@sharmacoffeeworks.com',
    password: 'ScW@1987',
    role: 'super_admin'
  },
  {
    email: 'sharmacoffeeoffice@gmail.com',
    password: 'SCO@1987',
    role: 'staff'
  }
];

async function seedAdmins() {
  console.log('Starting admin account seeding...\n');

  for (const admin of admins) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(admin)
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✓ ${admin.email} (${admin.role}): ${data.message}`);
      } else {
        console.error(`✗ ${admin.email}: ${data.error}`);
      }
    } catch (error) {
      console.error(`✗ ${admin.email}: ${error.message}`);
    }
  }

  console.log('\nAdmin seeding completed!');
}

seedAdmins();
