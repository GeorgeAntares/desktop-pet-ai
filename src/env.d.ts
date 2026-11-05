import type { PetApi } from '../shared/api'

declare global {
  interface Window {
    pet: PetApi
  }
}

export {}
