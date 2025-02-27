import { GraphQLList } from "graphql";
import { UserType } from "./users.type.js";
import { getAllUsersResolver } from "./users.resolve.js";

export const GetAllUsersField = {
    type: new GraphQLList(UserType),
    resolve: getAllUsersResolver
};