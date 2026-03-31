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

export const SET_ROAST_FLAVORS = graphql(`
  mutation SetRoastFlavors($roastId: String!, $descriptorIds: [String!]!) {
    setRoastFlavors(roastId: $roastId, descriptorIds: $descriptorIds) {
      id
      flavors { id name category color isOffFlavor }
    }
  }
`);

export const SET_ROAST_OFF_FLAVORS = graphql(`
  mutation SetRoastOffFlavors($roastId: String!, $descriptorIds: [String!]!) {
    setRoastOffFlavors(roastId: $roastId, descriptorIds: $descriptorIds) {
      id
      offFlavors { id name category color isOffFlavor }
    }
  }
`);

export const PREVIEW_ROAST_LOG = graphql(`
  query PreviewRoastLog($fileName: String!, $fileContent: String!) {
    previewRoastLog(fileName: $fileName, fileContent: $fileContent) {
      roastDate
      ambientTemp
      roastingLevel
      profileShortName
      profileDesigner
      colourChangeTime
      firstCrackTime
      roastEndTime
      developmentPercent
      totalDuration
      suggestedBean {
        id
        shortName
        bean { id name }
      }
      parseWarnings
    }
  }
`);

export const UPLOAD_ROAST_LOG = graphql(`
  mutation UploadRoastLog($beanId: String!, $fileName: String!, $fileContent: String!) {
    uploadRoastLog(beanId: $beanId, fileName: $fileName, fileContent: $fileContent) {
      roast { id }
      parseWarnings
    }
  }
`);

export const ROASTS_BY_BEAN_QUERY = graphql(`
  query RoastsByBean($beanId: String!) {
    roastsByBean(beanId: $beanId) {
      id
      roastDate
      notes
      developmentTime
      developmentPercent
      totalDuration
      firstCrackTemp
      roastEndTemp
      rating
      flavors { id name category color isOffFlavor }
      offFlavors { id name category color isOffFlavor }
    }
  }
`);

export const UPDATE_USER_BEAN = graphql(`
  mutation UpdateUserBean($id: String!, $notes: String, $shortName: String) {
    updateUserBean(id: $id, notes: $notes, shortName: $shortName) {
      id
      notes
      shortName
    }
  }
`);

export const CREATE_FLAVOR_DESCRIPTOR = graphql(`
  mutation CreateFlavorDescriptor($name: String!, $category: FlavorCategory!) {
    createFlavorDescriptor(name: $name, category: $category) {
      id
      name
      category
      isCustom
      color
      isOffFlavor
    }
  }
`);
