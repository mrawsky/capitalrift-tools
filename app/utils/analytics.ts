// Central analytics vocabulary. Keeping event names and feature-flag keys in
// one place keeps the PostHog dashboard, the code and the documentation in sync.

export const ANALYTICS_EVENTS = {
  toolCalculated: 'tool_calculated',
  shoppingListBuilt: 'shopping_list_built',
  menuCodeDecoded: 'menu_code_decoded',
  menuCodeSaved: 'menu_code_saved',
  surveyDepositSaved: 'survey_deposit_saved',
  faqOpened: 'faq_opened',
} as const

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]

// Every tool surface added in the power/climate/business release can be rolled
// out or rolled back with a PostHog flag. Each defaults to on, so the tools keep
// working when PostHog is unconfigured or a flag is not defined yet.
export const FEATURE_FLAGS = {
  homeNewTools: 'home-new-tools',
  plannerClimatePower: 'planner-climate-power',
  recipeCost: 'recipe-cost',
  recipeMenuEmbed: 'recipe-menu-embed',
  combinedShoppingList: 'combined-shopping-list',
  marketReference: 'market-reference',
} as const

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS]
