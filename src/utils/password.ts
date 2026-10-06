import * as crypto from "crypto";
import * as argon2 from "argon2";
import { customAlphabet, nanoid } from "nanoid";

export const createUUID = () => crypto.randomUUID();

export const createHash = () => nanoid(64);

const recoveryCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 10);

export const createRecoveryCode = () => recoveryCode();

export const createSalt = () => crypto.randomBytes(16).toString("base64");

export const createPassword = async ({ password, salt }) =>
  await argon2.hash(password + salt);

export const verifyPassword = async ({ user_password, password, salt }) =>
  await argon2.verify(user_password, password + salt);

export const createToken = async (salt) => argon2.hash(salt);

export const createCredentials = async (_password: string) => {
  const salt = createSalt();
  const password = await createPassword({ password: _password, salt });
  return {
    salt,
    password,
  };
};
