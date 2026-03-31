import { graphql } from "./graphql";

export const MY_ROASTS_QUERY = graphql(`
  query MyRoasts {
    myRoasts {
      id
      roastDate
      notes
      developmentTime
      developmentPercent
      totalDuration
      firstCrackTemp
      roastEndTemp
      colourChangeTime
      colourChangeTemp
      firstCrackTime
      roastEndTime
      rating
      isShared
      shareToken
      bean {
        id
        name
      }
      flavors {
        id
        name
        category
        color
        isOffFlavor
      }
      offFlavors {
        id
        name
        category
        color
        isOffFlavor
      }
    }
  }
`);

export const UPDATE_ROAST_RATING = graphql(`
  mutation UpdateRoastRating($id: String!, $input: UpdateRoastInput!) {
    updateRoast(id: $id, input: $input) {
      id
      rating
    }
  }
`);

export const MY_BEANS_QUERY = graphql(`
  query MyBeans {
    myBeans {
      id
      shortName
      notes
      bean {
        id
        name
        origin
        process
        elevation
        sourceUrl
        bagNotes
      }
    }
  }
`);

export const ROAST_BY_ID_QUERY = graphql(`
  query RoastById($id: String!) {
    roastById(id: $id) {
      id
      roastDate
      notes
      rating
      ambientTemp
      developmentTime
      developmentPercent
      totalDuration
      colourChangeTime
      colourChangeTemp
      firstCrackTime
      firstCrackTemp
      roastEndTime
      roastEndTemp
      timeSeriesData
      roastProfileCurve
      fanProfileCurve
      isShared
      shareToken
      bean {
        id
        name
        sourceUrl
      }
      roastProfile {
        id
        fileName
      }
      flavors {
        id
        name
        category
        color
        isOffFlavor
      }
      offFlavors {
        id
        name
        category
        color
        isOffFlavor
      }
    }
  }
`);

export const DELETE_ROAST_MUTATION = graphql(`
  mutation DeleteRoast($id: String!) {
    deleteRoast(id: $id)
  }
`);

export const TOGGLE_ROAST_SHARING_MUTATION = graphql(`
  mutation ToggleRoastSharing($id: String!) {
    toggleRoastSharing(id: $id) {
      id
      isShared
      shareToken
    }
  }
`);

export const UPDATE_ROAST_MUTATION = graphql(`
  mutation UpdateRoast($id: String!, $input: UpdateRoastInput!) {
    updateRoast(id: $id, input: $input) {
      id
      notes
      rating
    }
  }
`);

export const FLAVOR_DESCRIPTORS_QUERY = graphql(`
  query FlavorDescriptors($isOffFlavor: Boolean) {
    flavorDescriptors(isOffFlavor: $isOffFlavor) {
      id
      name
      category
      isOffFlavor
      isCustom
      color
    }
  }
`);
