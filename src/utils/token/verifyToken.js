import jwt from "jsonwebtoken";

export const VerifyToken = async ({ accessToken, SIGNATURE }) => {
    if (!accessToken || !SIGNATURE) {
        throw new Error("Missing token or signature");
    }
    const decoded = jwt.verify(accessToken, SIGNATURE);
    return decoded;
};
