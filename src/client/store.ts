import { atom, createStore } from "jotai"
import { atomWithStorage } from "jotai/utils"
import * as idb from "idb-keyval"
import { categories } from "./constants"

const fileListAtom = atom<File[]>()
const isLoading = atom<boolean>(false)
const showHistory = atom<boolean>(false)
const saveTriggerAtom = atomWithStorage<number>("result_key", 0)
const imagePreviewsAtom = atom<ImagePreview[]>([])
const imagePreviewsResultUrlAtom = atom<string[]>([])
const retainedPreviews = atom<Set<string>>()

const store = createStore()
const resultStore = idb.createStore("stocky", "generate_result")

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
  file: File,
} & GenerateResponse

const FileType = {
  JPEG: "image/jpeg",
  PNG: "image/png",
  SVG: "image/svg+xml",
  EPS: "application/postscript"
}

const saveGenerateResult = async (key: string, data: ImageWithMetadata[]): Promise<string> => {
  await idb.set(key, data, resultStore)
  return key
}

const resultKeysAtom = atom(async (get) => {
  get(saveTriggerAtom)
  const keys = await idb.keys(resultStore)
  if (keys.length === 0) return []
  return keys.toReversed()
})

const clearGenerateResult = atom(null, async (_, set) => {
  await idb.clear(resultStore)
  set(saveTriggerAtom, () => 0)
})

const clearGenerateResultByKey = atom(null, async (_, set, key?: IDBValidKey) => {
  if (key !== undefined && key !== null) {
    await idb.del(key, resultStore)
    set(saveTriggerAtom, (prev) => prev + 1)
  }
})

const generateResultAtom = atom(async (get): Promise<ImageResult[]> => {
  get(saveTriggerAtom)
  const entries = await idb.entries(resultStore)
  return entries.toReversed().flatMap(([k, v]) => {
    const img = v as ImageWithMetadata
    const previewUrl = URL.createObjectURL(img.file)
    return ({ ...v, fileName: img.file.name, previewUrl } as ImageResult)
  })
})

const getResult = async (key: IDBValidKey) => {
  const entries = await idb.get(key, resultStore) as ImageWithMetadata[]
  return entries.map((img) => {
    const previewUrl = URL.createObjectURL(img.file)
    return ({ ...img, fileName: img.file.name, previewUrl } as ImageResult)
  })
}

const updateFileListAtom = atom(null, async (get, set, payload: FileList | null) => {
  const currentPreviews = get(imagePreviewsAtom)
  currentPreviews.forEach(preview => {
    if (!get(retainedPreviews)?.has(preview.url)) {
      URL.revokeObjectURL(preview.url)
    }
  })
  const [epsFiles, imgFiles] = Array.from(payload ?? []).reduce<[File[], File[]]>((acc, file) => {
    if (file.type === FileType.EPS) {
      acc[0]?.push(file)
    } else {
      acc[1]?.push(file)
    }
    return acc
  }, [[], []])
  const epsConverted = await convertEpsToPng(epsFiles)
  const mergedFiles = [...epsConverted, ...imgFiles]
  const newPreviews = mergedFiles.map(file => ({
    name: file.name,
    url: URL.createObjectURL(file),
    type: file.type
  } as ImagePreview))
  set(fileListAtom, mergedFiles)
  set(imagePreviewsAtom, newPreviews)
})

const convertEpsToPng = async (files: File[]) => {
  if (files.length === 0) {
    return []
  }
  const formData = new FormData()
  files.forEach(file => formData.append("eps", file))
  return fetch("/eps", {
    method: "POST",
    body: formData
  })
    .then(res => res.formData())
    .then(body => body.getAll("pngs") as File[])
}

const generateCsv = async (key?: IDBValidKey) => {
  if (key === undefined || key === null) {
    alert("oops")
  }
  const entries: ImageWithMetadata[] = await idb.get(key!, resultStore) ?? []
  const header = "Filename,Title,Keywords,Category,Releases"
  const rows = entries.map(image => {
    const fileName = image.file.name
    const title = image.title
    const category = categories[image.category]
    const keywords = `"${image.keywords.join(",")}"`
    return `${fileName},${title},${keywords},${category},`
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
  const imageList = get(fileListAtom) ?? []
  if ((imageList?.length ?? 0) <= 0) {
    setLoading(false)
    return
  }
  const formData = new FormData()
  imageList.forEach((file, i) => {
    if (file.name.endsWith(".eps")) {
      formData.append("images", file, `eps_image_${i}.png`)
    } else {
      formData.append("images", file)
    }
  })
  return await fetch("/generate", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(async (data: GenerateResponse[]) => {
      get(imagePreviewsResultUrlAtom).forEach(url => URL.revokeObjectURL(url))
      const key = crypto.randomUUID()
      const result = data.map((d: GenerateResponse) => {
        const file = imageList[d.imageIndex]!
        return { ...d, file } as ImageWithMetadata
      })
      await saveGenerateResult(key, result)
      set(saveTriggerAtom, (trigger) => trigger + 1)
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
  clearGenerateResult,
  resultKeysAtom,
  getResult,
  clearGenerateResultByKey
}

export type {
  ImagePreview,
  GenerateResponse,
  ImageWithMetadata,
  ImageResult
}