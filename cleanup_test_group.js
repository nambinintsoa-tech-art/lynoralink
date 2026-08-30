const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find the test group
    const group = await prisma.group.findFirst({ 
      where: { name: { contains: 'Persist Check' } } 
    });
    
    if (group) {
      console.log('✓ Group found:', group.id, '-', group.name);
      console.log('  Owner ID:', group.ownerId);
      
      // Delete it
      await prisma.group.delete({ where: { id: group.id } });
      console.log('✓ Group deleted successfully');
    } else {
      console.log('✗ No test group found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
