import * as bcrypt from 'bcrypt';

async function hash(password: string, rounds: number = 12): Promise<string> {
  const pepper = process.env.PASSWORD_PEPPER;

  const hashedPassword: string = await bcrypt.hash(password + pepper, rounds);

  return hashedPassword;
}

async function compare(providedPassword: string, storedPassword: string) {
  const pepper = process.env.PASSWORD_PEPPER;

  const isMatch: boolean = await bcrypt.compare(
    providedPassword + pepper,
    storedPassword,
  );

  return isMatch;
}

const password = {
  hash,
  compare,
};

export default password;
