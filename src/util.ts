import { setApiKey, setMaskedApiKey } from "./server/store"

async function init() {
  const keyFile = Bun.file("./key.txt")
  if (!await keyFile.exists()) {
    console.error("key.txt missing")
    process.exit(0)
  }

  const key = await keyFile.text()
  setApiKey(key)
  setMaskedApiKey(key)
}

export {
  init
}