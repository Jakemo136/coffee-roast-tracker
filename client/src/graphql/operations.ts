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
        variety
        sourceUrl
        bagNotes
        score
        cropYear
        suggestedFlavors
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
  mutation UploadRoastLog($beanId: String!, $fileName: String!, $fileContent: String!, $notes: String) {
    uploadRoastLog(beanId: $beanId, fileName: $fileName, fileContent: $fileContent, notes: $notes) {
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

export const SCRAPE_BEAN_URL = graphql(`
  query ScrapeBeanUrl($url: String!) {
    scrapeBeanUrl(url: $url) {
      name
      origin
      process
      elevation
      variety
      bagNotes
      score
      cropYear
      suggestedFlavors
    }
  }
`);

export const PARSE_BEAN_PAGE = graphql(`
  query ParseBeanPage($html: String!) {
    parseBeanPage(html: $html) {
      name
      origin
      process
      elevation
      variety
      bagNotes
      score
      cropYear
      suggestedFlavors
    }
  }
`);

export const CREATE_BEAN = graphql(`
  mutation CreateBean($input: CreateBeanInput!) {
    createBean(input: $input) {
      id
      shortName
      bean { id name origin process elevation variety sourceUrl bagNotes score cropYear suggestedFlavors }
    }
  }
`);

export const ROASTS_BY_IDS_QUERY = graphql(`
  query RoastsByIds($ids: [String!]!) {
    roastsByIds(ids: $ids) {
      id
      roastDate
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
      timeSeriesData
      bean { id name }
    }
  }
`);

export const USER_SETTINGS_QUERY = graphql(`
  query UserSettings {
    userSettings {
      id
      tempUnit
    }
  }
`);

export const UPDATE_TEMP_UNIT = graphql(`
  mutation UpdateTempUnit($tempUnit: TempUnit!) {
    updateTempUnit(tempUnit: $tempUnit) {
      id
      tempUnit
    }
  }
`);

export const ROAST_BY_SHARE_TOKEN = graphql(`
  query RoastByShareToken($token: String!) {
    roastByShareToken(token: $token) {
      id
      roastDate
      notes
      rating
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
      bean { id name }
      roastProfile { id fileName }
      flavors { id name category color isOffFlavor }
      offFlavors { id name category color isOffFlavor }
    }
  }
`);

export const UPDATE_BEAN = graphql(`
  mutation UpdateBean($id: String!, $input: UpdateBeanInput!) {
    updateBean(id: $id, input: $input) {
      id
      name
      origin
      process
      elevation
      variety
      bagNotes
      score
      cropYear
    }
  }
`);

export const UPDATE_BEAN_SUGGESTED_FLAVORS = graphql(`
  mutation UpdateBeanSuggestedFlavors($beanId: String!, $suggestedFlavors: [String!]!) {
    updateBeanSuggestedFlavors(beanId: $beanId, suggestedFlavors: $suggestedFlavors) {
      id
      suggestedFlavors
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
