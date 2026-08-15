import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
  clearGenerateResult, clearGenerateResultByKey, fileListAtom, generateCsv, generateResultAtom, getResult, imagePreviewsAtom,
  imagePreviewsResultUrlAtom, isLoading, isProcessing, resultKeysAtom, setShowHistory, showHistory, store, updateFileListAtom,
  uploadFiles, type ImagePreview, type ImageResult
} from "./store"
import { useEffect, useState } from "react"
import {
  KeyIcon, PhotoIcon, TrashIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, ChevronLeftIcon,
  ChevronRightIcon, ArrowLeftStartOnRectangleIcon, SparklesIcon, ArrowRightEndOnRectangleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline"

const DirectoryInput = () => {
  const [, updateFileList] = useAtom(updateFileListAtom, { store })
  const [fileCount, setFileCount] = useState(0)
  const [, setLoading] = useAtom(isLoading)
  const handleInputFile = (e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length ?? 0 > 0) {
      setLoading(true)
      setFileCount(files?.length!!)
      updateFileList(files!).then(() => setLoading(false))
    }
  }

  const handleResetBtn = () => {
    updateFileList(null)
    setFileCount(0)
  }

  return (
    <div className="flex flex-row gap-4">
      <div>
        <label htmlFor="input-file" className="btn btn-dash flex gap-4">
          <PhotoIcon />
          <p className="text-sm">pilih gambar</p>
        </label>
        <input
          id="input-file"
          type="file"
          className="file-input"
          accept=".jpg, .jpeg, .png, .eps"
          multiple onChange={(e) => handleInputFile(e)}
          hidden
        />
      </div>
      <div className="flex flex-row gap-4">
        <div className="m-auto text-center items-center justify-center self-center">{fileCount} file(s)</div>
        <div className="flex flex-row">
          <button className="btn btn-warning" onClick={() => handleResetBtn()}>
            <div className="flex gap-2 flex-row">
              <ArrowUturnLeftIcon width={24} />
              <div>reset</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

const Heading = () => {
  const [apiKey, setApikey] = useState<string>()
  const [, uploadAtom] = useAtom(uploadFiles, { store })
  const processing = useAtomValue(isProcessing, { store })
  const fileList = useAtomValue(fileListAtom, { store })

  useEffect(() => {
    fetch("/key").then(async res => setApikey(await res.text()))
  }, [])

  const generate = () => {
    uploadAtom()
      .then(() => setShowHistory(true))
  }

  return (
    <div className="card shadow-xs bg-base-300 rounded-none sticky top-0 z-50 h-1/10">
      <div className="card-body flex flex-row justify-between gap-8">
        <div className="flex-4">
          <DirectoryInput />
        </div>
        <div className="flex-3 flex flex-row gap-2 justify-end">
          <div className="flex items-center gap-2">
            <KeyIcon width={24} />
            <p className="text-center">{apiKey}</p>
          </div>
          <div className="divider divider-horizontal"></div>
          {processing && (<span className="loading" />)}
          <div className="flex gap-4 justify-end">
            <button className="btn btn-success" disabled={(fileList?.length ?? 0) <= 0 || processing} onClick={() => generate()}>
              <SparklesIcon width={24} />
              <p>generate</p>
            </button>
            <button className="btn btn-secondary" disabled={processing} onClick={() => setShowHistory(true)}>
              <ArrowRightEndOnRectangleIcon width={24} />
              <p>lihat hasil</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ImageRow = (props: ImagePreview) => {
  return (
    <div className="card bg-base-200">
      <figure className="aspect-video shrink">
        {props.type !== "application/postscript" ? (<img className="object-cover" src={props.url} />) : (
          <div className="mask mask-b-from-primary w-full h-full bg-secondary flex justify-center items-center">
            <p className="text-center">EPS</p>
          </div>
        )}
      </figure>
      <div className="card-body">
        <div>{props.name}</div>
      </div>
    </div>
  )
}

const ImageResultRow = (props: ImageResult) => {
  const setPreview = useSetAtom(imagePreviewsResultUrlAtom)
  setPreview((prev) => [...prev, props.previewUrl])
  return (
    <div className="card card-side bg-base-200">
      <figure className="min-w-60 max-w-60 aspect-square shrink">
        {props.previewUrl !== null ? (<img className="object-cover" src={props.previewUrl} />) : (
          <div className="mask mask-b-from-primary w-full bg-secondary flex justify-center items-center">
            <p className="text-center">EPS</p>
          </div>
        )}
      </figure>
      <div className="card-body">
        <table className="table table-sm">
          <tbody>
            <tr>
              <th>file:</th>
              <td>{props.fileName}</td>
            </tr>
            <tr>
              <th>title:</th>
              <td>{props.title}</td>
            </tr>
            <tr>
              <th>description:</th>
              <td>{props.description}</td>
            </tr>
            <tr>
              <th>category:</th>
              <td>{`${props.first_category}, ${props.second_category}`}</td>
            </tr>
            <tr>
              <th>keywords:</th>
              <td>{props.keywords.join(", ")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ImageRows = () => {
  const imagePreviews = useAtomValue(imagePreviewsAtom, { store })
  return imagePreviews.map((preview, i) => (
    <ImageRow key={i} {...preview} />
  ))
}

const ImageResultRows = ({ generateResult }: { generateResult: ImageResult[] }) => {
  return generateResult?.map((result, i) => (
    <ImageResultRow key={i}  {...result} />
  ))
}

const Main = () => {
  const loading = useAtomValue(isLoading, { store })
  return loading ? (
    <div className="flex-1 flex flex-col justify-center items-center">
      <span className="loading loading-bars" />
    </div>
  ) : (
    <div className="grid grid-cols-6 gap-8 px-16 pb-8">
      <ImageRows />
    </div>
  )
}

const DeleteConfirmation = () => {
  const clearResult = useSetAtom(clearGenerateResult)
  return (
    <dialog id="delete_confirmation" className="modal">
      <div className="modal-box">
        <p className="py-4">hapus semua metadata</p>
        <div className="modal-action">
          <form method="dialog" className="flex gap-2">
            <button className="btn btn-info" onClick={() => clearResult()}>yes</button>
            <button className="btn btn-ghhost">no</button>
          </form>
        </div>
      </div>
    </dialog>
  )
}

const History = () => {
  const [page, setPage] = useState(0)
  const resultKeys = useAtomValue(resultKeysAtom)
  const [result, setResult] = useState<ImageResult[]>([])
  const deleteGroup = useSetAtom(clearGenerateResultByKey)

  useEffect(() => {
    let flag = false
    const retrieve = async () => {
      if (!flag) {
        if (resultKeys.length > 0) {
          const data = await getResult(resultKeys[page]!)
          setResult(data)
        } else {
          setResult([])
        }
      }
    }
    retrieve()
    return () => {
      flag = true
    }
  }, [page, resultKeys])

  const handleDelete = () => {
    const fallBackPage = page > 0 ? page - 1 : 0
    deleteGroup(resultKeys[page])
    setPage(fallBackPage)
  }

  return (
    <div className="absolute z-51 h-full w-full bg-base-100 flex flex-col gap-6">
      <div className="card sticky bg-base-300 top-0 z-52 rounded-none">
        <div className="card-body flex flex-row justify-end gap-4">
          <button
            className="btn btn-warning"
            onClick={() => (document.getElementById("delete_confirmation") as HTMLDialogElement)?.showModal()}>
            <ArrowPathIcon width={24} />
            <p>hapus semua</p>
          </button>
          <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>
            <ArrowLeftStartOnRectangleIcon width={24} />
            <p>kembali</p>
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-6 p-8">
        <ImageResultRows generateResult={result} />
      </div>
      <div className="flex gap-4 sticky bottom-0 bg-base-100 p-4">
        <div className="flex-1">
          <button
            className="btn btn-error"
            disabled={result.length <= 0}
            onClick={() => handleDelete()}>
            <TrashIcon width={24} />
          </button>
          <DeleteConfirmation />
        </div>
        <div className="flex-1 flex justify-center gap-4">
          <button className="btn btn-secondary w-fit" disabled={result.length === 0 || page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeftIcon width={24} />
          </button>
          <button className="btn btn-secondary w-fit" disabled={result.length === 0 || page === resultKeys.length - 1} onClick={() => setPage(page + 1)}>
            <ChevronRightIcon width={24} />
          </button>
          {resultKeys.length > 0 && (
            <div className="flex flex-col justify-center items-centers">
              {page + 1} / {resultKeys.length}
            </div>
          )}
        </div>
        <div className="flex-1 flex justify-end">
          <button className="btn btn-primary w-fit" disabled={result.length <= 0} onClick={() => generateCsv(resultKeys[page])}>
            <ArrowDownTrayIcon width={24} />
            <p>csv</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export function App() {
  const isShowHistory = useAtomValue(showHistory, { store })
  return (
    <div className="flex flex-col mx-auto gap-8 w-full h-screen">
      <Heading />
      <Main />
      {isShowHistory && <History />}
    </div>
  )
}

export default App
