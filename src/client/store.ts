import { atom, createStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import * as idb from "idb-keyval"
import { categories } from "./constants"

const fileListAtom = atom<FileList | null>()
const isLoading = atom<boolean>(false)
const showHistory = atom<boolean>(false)
const saveTriggerAtom = atomWithStorage<number>("result_key", 0)
const imagePreviewsAtom = atom<ImagePreview[]>([])
const imagePreviewsResultUrlAtom = atom<string[]>([])
const retainedPreviews = atom<Set<string>>()

const store = createStore()
const resultStore = idb.createStore("stocky", "generate_result")

const saveGenerateResult = async (key: string, data: ImageWithMetadata): Promise<string> => {
  await idb.set(key, data, resultStore)
  return key
}

const clearGenerateResult = atom(null, async (_, set) => {
  await idb.clear(resultStore)
  set(saveTriggerAtom, () => 0)
})

const generateResultAtom = atom(async (get): Promise<ImageResult[]> => {
  get(saveTriggerAtom)
  const entries = await idb.entries(resultStore)
  return entries.toReversed().flatMap(([k, v]) => {
    const image = v as ImageWithMetadata
    const previewUrl = image.file.type === "application/postscript" ? null : URL.createObjectURL(v.file)
    return ({ k, ...v, previewUrl })
  })
})

const setFileList = (list: FileList) => {
  store.set(fileListAtom, list)
}

type GenerateResponse = {
  fileName: string,
  imageIndex: number,
  title: string,
  description: string,
  category: string,
  keywords: string[]
}

type ImagePreview = {
  name: string,
  type: string,
  url: string
}

type ImageResult = {
  previewUrl: string
} & GenerateResponse

type ImageWithMetadata = {
  file: Blob,
} & GenerateResponse

const updateFileListAtom = atom(null, (get, set, payload: FileList | null) => {
  const currentPreviews = get(imagePreviewsAtom)
  currentPreviews.forEach(preview => {
    if (!get(retainedPreviews)?.has(preview.url)) {
      URL.revokeObjectURL(preview.url)
    }
  })
  const newPreviews = Array.from(payload ?? []).map(file => ({
    name: file.name,
    url: file.type === "application/postscript" ? "" : URL.createObjectURL(file),
    type: file.type
  } as ImagePreview))
  set(fileListAtom, payload)
  set(imagePreviewsAtom, newPreviews)
})

const generateCsv = async () => {
  const entries: ImageWithMetadata[] = (await idb.entries(resultStore)).flatMap(([k, v]) => ({ ...v }))
  const header = "Filename,Title,Keywords,Category,Releases"
  const rows = entries.map(image => {
    const fileName = image.fileName
    const title = image.title
    const category = categories[image.category]
    const keywords = `"${image.keywords.join(",")}"`
    const releases = "Berta"
    return `${fileName},${title},${keywords},${category},${releases}`
  }).join("\n")
  const csv = [header, rows].join("\n")
  const blob = new Blob(['\uFEFF' + csv], { type: "text/csv;charset=utf-8;" })
  const csvUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = csvUrl
  link.hidden = true
  link.setAttribute("download", "metadata.csv")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(csvUrl)
}

const uploadFiles = atom(null, async (get, set) => {
  setLoading(true)
  const imageList = get(fileListAtom)
  if ((imageList?.length ?? 0) <= 0) {
    setLoading(false)
    return
  }
  const formData = new FormData()
  Array.from(imageList ?? []).forEach(file => formData.append("images", file))
  return await fetch("/start", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then((data: GenerateResponse[]) => {
      get(imagePreviewsResultUrlAtom).forEach(url => URL.revokeObjectURL(url))
      data.forEach(async (d: GenerateResponse) => {
        const key = crypto.randomUUID()
        await saveGenerateResult(key, { ...d, file: imageList?.item(d.imageIndex)! })
        set(saveTriggerAtom, (trigger) => trigger + 1)
      })
    })
    .catch((e: Error) => {
      return []
    })
    .finally(() => setLoading(false))
})

const setLoading = (loading: boolean) => {
  store.set(isLoading, loading)
}

const setShowHistory = (show: boolean) => {
  store.set(showHistory, show)
}

const setImagePreviews = (previews: ImagePreview[]) => {
  store.set(imagePreviewsAtom, previews)
}

export {
  fileListAtom,
  isLoading,
  setLoading,
  setFileList,
  store,
  uploadFiles,
  showHistory,
  setShowHistory,
  imagePreviewsAtom,
  setImagePreviews,
  updateFileListAtom,
  generateResultAtom,
  imagePreviewsResultUrlAtom,
  generateCsv,
  clearGenerateResult
}

export type {
  ImagePreview,
  GenerateResponse,
  ImageWithMetadata,
  ImageResult
}