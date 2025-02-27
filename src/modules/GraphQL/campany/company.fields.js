import { GraphQLList } from "graphql";
import { CompanyType } from "./company.type.js";
import { getAllCompaniesResolver } from "./company.resolve.js";

export const GetAllCompaniesField = {
    type: new GraphQLList(CompanyType),
    resolve: getAllCompaniesResolver
};