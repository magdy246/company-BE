import cron from 'node-cron';
import UsersModel from "../DB/models/users.model.js";

// Delete expired OTPs every 6 hours
cron.schedule('0 */6 * * *', async () => {
    try {
        await UsersModel.updateMany(
            { 'OTP.expiresIn': { $lt: new Date() } },
            { $pull: { OTP: { expiresIn: { $lt: new Date() } } } }
        );
        console.log('Expired OTPs cleaned successfully');
    } catch (error) {
        console.error('Error cleaning expired OTPs:', error);
    }
});