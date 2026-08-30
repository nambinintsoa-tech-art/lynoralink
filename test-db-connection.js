const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Test if User table exists
    const userCount = await prisma.user.count();
    console.log(`✅ User table exists, count: ${userCount}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
}

testConnection();