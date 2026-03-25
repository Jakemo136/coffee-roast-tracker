import graphqlTag from "graphql-tag";
const gql = graphqlTag.gql ?? graphqlTag;

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  enum TempUnit {
    CELSIUS
    FAHRENHEIT
  }

  enum FileType {
    KLOG
    CSV
  }

  enum ProfileType {
    KAFFELOGIC
  }

  type User {
    id: ID!
    clerkId: String!
    tempUnit: TempUnit!
    userBeans: [UserBean!]!
    roasts: [Roast!]!
    createdAt: DateTime!
  }

  type Bean {
    id: ID!
    name: String!
    origin: String
    process: String
    cropYear: Int
    roasts: [Roast!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserBean {
    id: ID!
    notes: String
    bean: Bean!
    createdAt: DateTime!
  }

  type Roast {
    id: ID!
    # Header metadata from .klog
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    # Event marker timestamps
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    # Temperatures at event markers
    colourChangeTemp: Float
    firstCrackTemp: Float
    roastEndTemp: Float
    # Phase data
    developmentTime: Float
    developmentPercent: Float
    totalDuration: Float
    roastDate: DateTime
    # Time-series and curve data for chart rendering
    timeSeriesData: JSON
    roastProfileCurve: JSON
    fanProfileCurve: JSON
    # User notes and sharing
    notes: String
    isShared: Boolean!
    shareToken: String!
    bean: Bean!
    roastFiles: [RoastFile!]!
    roastProfile: RoastProfile
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RoastFile {
    id: ID!
    fileKey: String!
    fileName: String!
    fileType: FileType!
    createdAt: DateTime!
  }

  type RoastProfile {
    id: ID!
    fileKey: String!
    fileName: String!
    profileType: ProfileType!
    profileShortName: String
    profileDesigner: String
    downloadUrl: String
    createdAt: DateTime!
  }

  # --- Inputs ---

  input CreateBeanInput {
    name: String!
    origin: String
    process: String
    cropYear: Int
    notes: String
  }

  input CreateRoastInput {
    beanId: String!
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    colourChangeTemp: Float
    firstCrackTemp: Float
    roastEndTemp: Float
    developmentTime: Float
    developmentPercent: Float
    totalDuration: Float
    roastDate: DateTime
    timeSeriesData: JSON
    roastProfileCurve: JSON
    fanProfileCurve: JSON
    notes: String
  }

  input UpdateRoastInput {
    ambientTemp: Float
    roastingLevel: Float
    tastingNotes: String
    colourChangeTime: Float
    firstCrackTime: Float
    roastEndTime: Float
    colourChangeTemp: Float
    firstCrackTemp: Float
    roastEndTemp: Float
    developmentTime: Float
    developmentPercent: Float
    totalDuration: Float
    roastDate: DateTime
    timeSeriesData: JSON
    roastProfileCurve: JSON
    fanProfileCurve: JSON
    notes: String
  }

  input UploadRoastProfileInput {
    roastId: String!
    fileKey: String!
    fileName: String!
    profileType: ProfileType
  }

  # --- Queries ---

  type Query {
    # Authenticated
    myBeans: [UserBean!]!
    myRoasts: [Roast!]!
    roastById(id: String!): Roast
    roastsByBean(beanId: String!): [Roast!]!
    roastsByIds(ids: [String!]!): [Roast!]!

    # Public
    roastByShareToken(token: String!): Roast
  }

  # --- Mutations ---

  type Mutation {
    createBean(input: CreateBeanInput!): UserBean!
    addBeanToLibrary(beanId: String!, notes: String): UserBean!
    updateUserBean(id: String!, notes: String): UserBean!
    removeBeanFromLibrary(beanId: String!): Boolean!
    createRoast(input: CreateRoastInput!): Roast!
    updateRoast(id: String!, input: UpdateRoastInput!): Roast!
    deleteRoast(id: String!): Boolean!
    toggleRoastSharing(id: String!): Roast!
    uploadRoastProfile(input: UploadRoastProfileInput!): RoastProfile!
    updateTempUnit(tempUnit: TempUnit!): User!
  }
`;
