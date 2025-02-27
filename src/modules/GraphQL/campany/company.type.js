import { GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLList, GraphQLID } from "graphql";

export const CompanyType = new GraphQLObjectType({
    name: "Company",
    fields: {
        id: { type: GraphQLID },
        companyName: { type: GraphQLString },
        description: { type: GraphQLString },
        industry: { type: GraphQLString },
        address: { type: GraphQLString },
        numberOfEmployees: { type: GraphQLString },
        companyEmail: { type: GraphQLString },
        CreatedBy: { type: GraphQLID },
        Logo: {
            type: new GraphQLObjectType({
                name: "Logo",
                fields: {
                    secure_url: { type: GraphQLString },
                    public_id: { type: GraphQLString }
                }
            })
        },
        coverPic: {
            type: new GraphQLObjectType({
                name: "CoverPic",
                fields: {
                    secure_url: { type: GraphQLString },
                    public_id: { type: GraphQLString }
                }
            })
        },
        HRs: { type: new GraphQLList(GraphQLID) },
        bannedAt: { type: GraphQLString },
        deletedAt: { type: GraphQLString },
        isDeleted: { type: GraphQLBoolean },
        legalAttachment: {
            type: new GraphQLObjectType({
                name: "LegalAttachment",
                fields: {
                    secure_url: { type: GraphQLString },
                    public_id: { type: GraphQLString }
                }
            })
        },
        approvedByAdmin: { type: GraphQLBoolean },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString }
    }
});