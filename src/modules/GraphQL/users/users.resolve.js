import UsersModel from "../../../DB/models/users.model.js";

export const getAllUsersResolver = async () => {
    try {
        const users = await UsersModel.find().select('-password -OTP -__v'); // Exclude sensitive fields
        return users;
    } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
    }
};