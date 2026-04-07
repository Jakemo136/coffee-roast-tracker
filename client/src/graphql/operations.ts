import { graphql } from "./graphql";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

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
      isPublic
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
      isPublic
      userId
      bean {
        id
        name
        origin
        process
        elevation
        variety
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

// Public queries (no auth required)

export const PUBLIC_ROAST_QUERY = graphql(`
  query PublicRoast($id: String!) {
    roast(id: $id) {
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
      isPublic
      userId
      bean { id name origin process elevation variety sourceUrl }
      roastProfile { id fileName }
      flavors { id name category color isOffFlavor }
      offFlavors { id name category color isOffFlavor }
    }
  }
`);

export const PUBLIC_BEANS_QUERY = graphql(`
  query PublicBeans($limit: Int) {
    publicBeans(limit: $limit) {
      id
      name
      origin
      process
      variety
      suggestedFlavors
    }
  }
`);

export const PUBLIC_ROASTS_QUERY = graphql(`
  query PublicRoasts($beanId: String, $limit: Int, $offset: Int) {
    publicRoasts(beanId: $beanId, limit: $limit, offset: $offset) {
      id
      roastDate
      rating
      developmentTime
      developmentPercent
      totalDuration
      firstCrackTemp
      roastEndTemp
      bean { id name }
    }
  }
`);

export const PUBLIC_BEAN_QUERY = graphql(`
  query PublicBean($id: String!) {
    bean(id: $id) {
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
`);

export const COMMUNITY_STATS_QUERY = graphql(`
  query CommunityStats {
    communityStats {
      totalRoasts
      totalBeans
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
      suggestedBeans {
        id
        shortName
        bean { id name }
      }
      parseWarnings
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

export const USER_SETTINGS_QUERY = graphql(`
  query UserSettings {
    userSettings {
      id
      tempUnit
      theme
      privateByDefault
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

export const DOWNLOAD_PROFILE_QUERY = graphql(`
  query DownloadProfile($roastId: String!) {
    downloadProfile(roastId: $roastId) {
      fileName
      content
    }
  }
`);

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const UPLOAD_ROAST_LOG = graphql(`
  mutation UploadRoastLog($beanId: String!, $fileName: String!, $fileContent: String!, $notes: String) {
    uploadRoastLog(beanId: $beanId, fileName: $fileName, fileContent: $fileContent, notes: $notes) {
      roast { id }
      parseWarnings
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

export const UPDATE_ROAST_MUTATION = graphql(`
  mutation UpdateRoast($id: String!, $input: UpdateRoastInput!) {
    updateRoast(id: $id, input: $input) {
      id
      notes
      rating
    }
  }
`);

export const DELETE_ROAST_MUTATION = graphql(`
  mutation DeleteRoast($id: String!) {
    deleteRoast(id: $id)
  }
`);

export const TOGGLE_ROAST_PUBLIC_MUTATION = graphql(`
  mutation ToggleRoastPublic($id: String!) {
    toggleRoastPublic(id: $id) {
      id
      isPublic
    }
  }
`);

export const UPDATE_THEME = graphql(`
  mutation UpdateTheme($theme: String!) {
    updateTheme(theme: $theme) {
      id
      theme
    }
  }
`);

export const UPDATE_PRIVACY_DEFAULT = graphql(`
  mutation UpdatePrivacyDefault($privateByDefault: Boolean!) {
    updatePrivacyDefault(privateByDefault: $privateByDefault) {
      id
      privateByDefault
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

export const CREATE_BEAN = graphql(`
  mutation CreateBean($input: CreateBeanInput!) {
    createBean(input: $input) {
      id
      shortName
      bean { id name origin process elevation variety sourceUrl bagNotes supplier score cropYear suggestedFlavors }
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

export const UPDATE_USER_BEAN = graphql(`
  mutation UpdateUserBean($id: String!, $notes: String, $shortName: String) {
    updateUserBean(id: $id, notes: $notes, shortName: $shortName) {
      id
      notes
      shortName
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

export const UPDATE_TEMP_UNIT = graphql(`
  mutation UpdateTempUnit($tempUnit: TempUnit!) {
    updateTempUnit(tempUnit: $tempUnit) {
      id
      tempUnit
    }
  }
`);
