import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean all tables (in reverse dependency order)
  await prisma.pairBalance.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseShare.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.userPhone.deleteMany();
  await prisma.user.deleteMany();
  await prisma.group.deleteMany();

  console.log('✓ Cleaned existing data');

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      phones: {
        create: [
          { number: '+1234567890', label: 'mobile', verified: true },
          { number: '+1987654321', label: 'home', verified: false },
        ],
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob',
      phones: {
        create: [{ number: '+1111111111', label: 'mobile', verified: true }],
      },
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      name: 'Charlie',
      phones: {
        create: [{ number: '+2222222222', label: 'mobile', verified: true }],
      },
    },
  });

  console.log('✓ Created users: Alice, Bob, Charlie');

  // Create a group (Alice is admin/creator)
  const group = await prisma.group.create({
    data: {
      name: 'Weekend Trip',
      createdBy: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' },
          { userId: charlie.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('✓ Created group with members');

  // Create an expense: Alice paid 3000 cents ($30.00) for dinner
  // Split equally among all 3: each owes 1000 cents ($10.00)
  const expense1 = await prisma.expense.create({
    data: {
      groupId: group.id,
      paidByUserId: alice.id,
      totalAmount: 3000,
      currency: 'USD',
      description: 'Dinner',
      splitType: 'EQUAL',
      shares: {
        create: [
          { userId: alice.id, amountOwed: 1000 }, // Alice paid it, so no debt for herself
          { userId: bob.id, amountOwed: 1000 },
          { userId: charlie.id, amountOwed: 1000 },
        ],
      },
    },
  });

  // Create ledger entry for expense1
  // Bob owes Alice 1000 cents
  // Charlie owes Alice 1000 cents
  await prisma.ledgerEntry.create({
    data: {
      groupId: group.id,
      eventType: 'EXPENSE',
      fromUserId: bob.id,
      toUserId: alice.id,
      amount: 1000,
      referenceId: expense1.id,
      expenseId: expense1.id,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      groupId: group.id,
      eventType: 'EXPENSE',
      fromUserId: charlie.id,
      toUserId: alice.id,
      amount: 1000,
      referenceId: expense1.id,
      expenseId: expense1.id,
    },
  });

  console.log('✓ Created expense: Dinner (equal split)');

  // Create another expense: Bob paid 2400 cents ($24.00) for hotel
  // Split equally among all 3: each owes 800 cents ($8.00)
  const expense2 = await prisma.expense.create({
    data: {
      groupId: group.id,
      paidByUserId: bob.id,
      totalAmount: 2400,
      currency: 'USD',
      description: 'Hotel',
      splitType: 'EQUAL',
      shares: {
        create: [
          { userId: alice.id, amountOwed: 800 },
          { userId: bob.id, amountOwed: 800 },
          { userId: charlie.id, amountOwed: 800 },
        ],
      },
    },
  });

  // Create ledger entries for expense2
  await prisma.ledgerEntry.create({
    data: {
      groupId: group.id,
      eventType: 'EXPENSE',
      fromUserId: alice.id,
      toUserId: bob.id,
      amount: 800,
      referenceId: expense2.id,
      expenseId: expense2.id,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      groupId: group.id,
      eventType: 'EXPENSE',
      fromUserId: charlie.id,
      toUserId: bob.id,
      amount: 800,
      referenceId: expense2.id,
      expenseId: expense2.id,
    },
  });

  console.log('✓ Created expense: Hotel (equal split)');

  // Create pair balances (netting logic)
  // Bob -> Alice: owes 1000 - 800 = 200 cents
  // Charlie -> Alice: owes 1000 cents
  // Charlie -> Bob: owes 800 cents
  await prisma.pairBalance.create({
    data: {
      groupId: group.id,
      debtorUserId: bob.id,
      creditorUserId: alice.id,
      netAmount: 200,
    },
  });

  await prisma.pairBalance.create({
    data: {
      groupId: group.id,
      debtorUserId: charlie.id,
      creditorUserId: alice.id,
      netAmount: 1000,
    },
  });

  await prisma.pairBalance.create({
    data: {
      groupId: group.id,
      debtorUserId: charlie.id,
      creditorUserId: bob.id,
      netAmount: 800,
    },
  });

  console.log('✓ Created pair balances (netting applied)');

  // Record a settlement: Bob pays Alice 200 cents
  const settlement = await prisma.settlement.create({
    data: {
      groupId: group.id,
      fromUserId: bob.id,
      toUserId: alice.id,
      amount: 200,
    },
  });

  // Update pair balance after settlement
  await prisma.pairBalance.update({
    where: {
      groupId_debtorUserId_creditorUserId: {
        groupId: group.id,
        debtorUserId: bob.id,
        creditorUserId: alice.id,
      },
    },
    data: {
      netAmount: 0, // Settled completely
    },
  });

  // Create ledger entry for settlement
  await prisma.ledgerEntry.create({
    data: {
      groupId: group.id,
      eventType: 'SETTLEMENT',
      fromUserId: bob.id,
      toUserId: alice.id,
      amount: 200,
      referenceId: settlement.id,
      settlementId: settlement.id,
    },
  });

  console.log('✓ Created settlement: Bob paid Alice 200 cents');

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Test data overview:');
  console.log('  - Users: Alice, Bob, Charlie');
  console.log('  - Group: "Weekend Trip"');
  console.log('  - Expenses: Dinner (3000¢), Hotel (2400¢)');
  console.log('  - Settlement: Bob → Alice 200¢');
  console.log('  - Outstanding: Charlie owes Alice 1000¢, Charlie owes Bob 800¢');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
