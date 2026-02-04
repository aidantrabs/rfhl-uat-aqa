/**
 * test user definitions for UAT testing
 *
 * users are loaded from users.local.json (gitignored)
 * copy users.example.json to users.local.json and fill in your credentials
 *
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export type AccountType =
    | 'chequing'
    | 'savings'
    | 'credit'
    | 'loan'
    | 'utility';

export interface Account {
    name: string;
    type: AccountType;
    number: string;
    currency: string;
}

export interface TestUser {
    id: string;
    name: string;
    username: string;
    password: string;
    smsCode: string;
    accounts: Account[];
}

type UserData = Omit<TestUser, 'id'>;

/**
 *
 * load test users from users.local.json
 *
 */
function loadTestData(): Record<string, UserData> {
    const localPath = path.join(__dirname, 'users.local.json');

    if (!fs.existsSync(localPath)) {
        throw new Error(
            `Missing users.local.json. Copy users.example.json to users.local.json and fill in your credentials.`
        );
    }

    const content = fs.readFileSync(localPath, 'utf-8');
    return JSON.parse(content) as Record<string, UserData>;
}

const testData = loadTestData();

/**
 *
 * all available test users as an array (derived from testData).
 *
 */
export const testUsers: TestUser[] = Object.entries(testData).map(
    ([id, user]) => ({
        id,
        ...user,
    })
);

/**
 *
 * get a user by ID.
 * @throws Error if user not found
 *
 */
export function getUser(id: string): TestUser {
    const user = testUsers.find((u) => u.id === id);

    if (!user) {
        throw new Error(
            `Test user "${id}" not found. Available: ${testUsers.map((u) => u.id).join(', ')}`
        );
    }

    return user;
}

/**
 *
 * get the default test user.
 *
 */
export function getDefaultUser(): TestUser {
    return testUsers[0];
}

export function getAccounts(id: string): Account[] {
      const user = getUser(id);
   
      return user.accounts;
}
