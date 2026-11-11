/**
 * Types of the API, taken from the OpenAPI schema that FastAPI generates from contracts/.
 * Regenerate after any contract change (backend running):
 *   npm run gen:api
 * Never edit generated.ts by hand.
 */
import type { components } from './generated'

type S = components['schemas']

export type Action = S['Action']
export type Phase = S['Phase']
export type RoundKind = S['RoundKind']
export type Decision = S['Decision']
export type GameState = S['GameState']
export type Scenario = S['Scenario']
export type OnboardingAnswers = S['OnboardingAnswers']
export type Catalog = S['Catalog']
export type CatalogPortfolio = S['CatalogPortfolio']
export type Profile = S['Profile']
export type ParameterEstimate = S['ParameterEstimate']
export type SuitabilityLevels = S['SuitabilityLevels']
export type PortfolioProposal = S['PortfolioProposal']
export type CandidateMetrics = S['CandidateMetrics']
export type Posterior = S['Posterior']
export type Goal = S['Goal']
export type Horizon = S['Horizon']
export type Product = S['Product']
