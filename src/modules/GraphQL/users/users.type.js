import { GraphQLObjectType, GraphQLString, GraphQLBoolean, GraphQLList, GraphQLID } from "graphql";

export const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        username: { type: GraphQLString },
        email: { type: GraphQLString },
        mobileNumber: { type: GraphQLString },
        gender: { type: GraphQLString },
        DOB: { type: GraphQLString },
        role: { type: GraphQLString },
        isConfirmed: { type: GraphQLBoolean },
        isDeleted: { type: GraphQLBoolean },
        deletedAt: { type: GraphQLString },
        bannedAt: { type: GraphQLString },
        profilePic: {
            type: new GraphQLObjectType({
                name: "ProfilePic",
                fields: {
                    secure_url: { type: GraphQLString },
                    public_id: { type: GraphQLString }
                }
            })
        },
        coverPic: {
            type: new GraphQLList(new GraphQLObjectType({
                name: "coverPic",
                fields: {
                    secure_url: { type: GraphQLString },
                    public_id: { type: GraphQLString }
                }
            }))
        }
    }
});