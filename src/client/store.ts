import { atom, createStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import * as idb from "idb-keyval"

const fileListAtom = atom<FileList>()
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

const generateResultAtom = atom(async (get): Promise<ImageResult[]> => {
  get(saveTriggerAtom)
  const entries = await idb.entries(resultStore)
  console.log(entries)
  return entries.toReversed().flatMap(([k, v]) => {
    const previewUrl = URL.createObjectURL((v as ImageWithMetadata).file)
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
  url: string
}

type ImageResult = {
  previewUrl: string
} & GenerateResponse

type ImageWithMetadata = {
  file: Blob,
} & GenerateResponse

const updateFileListAtom = atom(null, (get, set, payload: FileList) => {
  const currentPreviews = get(imagePreviewsAtom)
  currentPreviews.forEach(preview => {
    if (!get(retainedPreviews)?.has(preview.url)) {
      URL.revokeObjectURL(preview.url)
    }
  })
  const newPreviews = Array.from(payload ?? []).map(file => ({
    name: file.name,
    url: URL.createObjectURL(file)
  } as ImagePreview))
  set(fileListAtom, payload)
  set(imagePreviewsAtom, newPreviews)
})

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
  imagePreviewsResultUrlAtom
}

export type {
  ImagePreview,
  GenerateResponse,
  ImageWithMetadata,
  ImageResult
}