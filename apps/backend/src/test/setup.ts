import { prisma } from '../config/database';

beforeAll(async () => {
  // Setup test database connection
});

afterAll(async () => {
  // Clean up test database
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up data between tests if needed
});

afterEach(async () => {
  // Clean up after each test
});