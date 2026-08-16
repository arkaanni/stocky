import { atom, createStore } from "jotai"

const store = createStore()
const loadingAtom = atom(false)
const fileAtom = atom<File>()
const generatedPrompt = atom<string>()
const imagePreviewUriAtom = atom<string>()

const generate = atom(null, async (get, set) => {
  set(loadingAtom, true)
  const img = get(fileAtom)
  if (!img) { alert("pilih gambar") }
  const formData = new FormData()
  formData.append("image", img!)
  fetch("/generate-prompt", {
    method: "POST",
    body: formData
  }).then(async res => {
    set(generatedPrompt, await res.text())
  }).finally(() => {
    set(loadingAtom, false)
  })
})


export {
  store,
  loadingAtom,
  generate,
  generatedPrompt,
  imagePreviewUriAtom,
  fileAtom
}