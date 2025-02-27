import CryptoJS from "crypto-js";

export const Decrypt = async ({ key, SIGNTURE = process.env.SIGNTURE }) => {
    try {
        const bytes = CryptoJS.AES.decrypt(key, SIGNTURE);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!decrypted) {
            console.error("Decryption resulted in empty string. Encrypted value:", key);
            throw new Error("Decryption failed: empty result");
        }
        
        return decrypted;
    } catch (error) {
        console.error("Decrypt failed:", error.message, "Encrypted value:", key);
        throw error;
    }
};