import { atom, createStore } from "jotai"

const apiKey = atom<string>()
const maskedApiKey = atom<string>()

const serverStore = createStore()

const setApiKey = (key: string) => {
  serverStore.set(apiKey, key)
}

const setMaskedApiKey = (key: string) => {
  serverStore.set(maskedApiKey, `**************${key?.substring(key.length - 8, key.length)}`)
}

export {
  serverStore,
  apiKey,
  maskedApiKey,
  setMaskedApiKey,
  setApiKey
}