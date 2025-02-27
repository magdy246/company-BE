import CompanyModel from "../../../DB/models/company.model.js";

export const getAllCompaniesResolver = async () => {
    try {
        const companies = await CompanyModel.find().select('-__v'); // Exclude version key
        return companies;
    } catch (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`);
    }
};