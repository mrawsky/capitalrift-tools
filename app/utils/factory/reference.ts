import { defaultRecipeFor, itemName } from './catalog'

export const CRAFTING_QUESTIONS = [
  { productId: 'nails', question: 'How many Nails does one Iron Bar make?' },
  { productId: 'machine_parts', question: 'How do you make Machine Parts?' },
  { productId: 'battery', question: 'How do you craft a Battery Pack?' },
  { productId: 'copper_bar', question: 'How do you make Copper Bars?' },
  { productId: 'fabric', question: 'How do you make Fabric?' },
  { productId: 'mining_barrow', question: 'How do you craft a Mining Barrow?' },
  { productId: 'fan_heater', question: 'How do you make a Fan Heater?' },
  { productId: 'industrial_heater', question: 'How do you make an Industrial Heater?' },
  { productId: 'industrial_ac', question: 'How do you make an Industrial Air Conditioner?' },
  { productId: 'portable_ac', question: 'How do you make a Portable Air Conditioner?' },
  { productId: 'coal_bunker', question: 'How do you make a Coal Bunker?' },
  { productId: 'coal_generator', question: 'How do you make a Coal Generator?' },
  { productId: 'fuel_tank', question: 'How do you make a Fuel Tank?' },
  { productId: 'hydro_turbine', question: 'How do you make a Water Turbine?' },
  { productId: 'oil_generator', question: 'How do you make an Oil Generator?' },
  { productId: 'wind_turbine', question: 'How do you make a Wind Turbine?' },
]

export const NEW_CRAFTING_PRODUCTS = ['coal_bunker', 'coal_generator', 'fuel_tank', 'hydro_turbine', 'oil_generator', 'wind_turbine', 'space_heater', 'air_conditioner', 'fan_heater', 'industrial_heater', 'industrial_ac', 'portable_ac']

export function craftingAnswer(productId: string) {
  const recipe = defaultRecipeFor(productId)
  if (!recipe) return ''
  const ingredients = recipe.inputs.map(input => `${input.quantity} ${itemName(input.itemId)}`).join(' + ')
  return `Make ${recipe.batch} ${itemName(productId)} per batch at the ${itemName(recipe.stationId)} using ${ingredients}.`
}

export function craftingDescription(productId: string) {
  const recipe = defaultRecipeFor(productId)
  if (!recipe) return ''
  return `Craft ${itemName(productId)} in Capital Rift at the ${itemName(recipe.stationId)}: ${recipe.batch} per batch. Find ingredients, output rates, and calculate materials for the full chain.`
}
