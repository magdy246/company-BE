import jwt from "jsonwebtoken"

export const generateToken = async ({ payload = {}, SECRET, option }) => {
    return jwt.sign({ id: payload.id, email: payload.email }, SECRET, option);
};
