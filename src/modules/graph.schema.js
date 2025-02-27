import { GraphQLList, GraphQLObjectType, GraphQLSchema } from "graphql";
import { GetAllUsersField } from "./GraphQL/users/users.fields.js";
import { GetAllCompaniesField } from "./GraphQL/campany/company.fields.js";

export const RootQuery = new GraphQLObjectType({
    name: "RootQuery",
    fields: {
        getAllUsers: GetAllUsersField,
        getAllCompanies: GetAllCompaniesField,
        allData: {
            type: new GraphQLObjectType({
                name: "AllData",
                fields: {
                    users: { type: new GraphQLList(GetAllUsersField.type) },
                    companies: { type: new GraphQLList(GetAllCompaniesField.type) }
                }
            }),
            resolve: async () => {
                try {
                    const users = await GetAllUsersField.resolve();
                    const companies = await GetAllCompaniesField.resolve();
                    return { users, companies };
                } catch (error) {
                    throw new Error(`Failed to fetch data: ${error.message}`);
                }
            }
        }
    }
});

export const schema = new GraphQLSchema({
    query: RootQuery
});