import bcrypt from 'bcrypt';

export const Hash = async ({ password, SALT_ROUNDS = process.env.SALT_ROUNDS }) => {
    return await bcrypt.hash(password, Number(SALT_ROUNDS))
}