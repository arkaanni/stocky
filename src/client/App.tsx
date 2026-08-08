import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { clearGenerateResult, fileListAtom, generateCsv, generateResultAtom, imagePreviewsAtom, imagePreviewsResultUrlAtom, isLoading, setFileList, setShowHistory, showHistory, store, updateFileListAtom, uploadFiles, type GenerateResponse, type ImagePreview, type ImageResult, type ImageWithMetadata } from "./store"
import { useEffect, useState } from "react"

const DirectoryInput = () => {
  const [, updateFileList] = useAtom(updateFileListAtom, { store })
  const [fileCount, setFileCount] = useState(0)
  const handleInputFile = (e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length ?? 0 > 0) {
      setFileCount(files?.length!!)
      updateFileList(files!)
    }
  }

  const handleResetBtn = () => {
    updateFileList(null)
    setFileCount(0)
  }

  return (
    <div className="flex flex-row gap-4">
      <div>
        <label htmlFor="input-file" className="btn btn-dash">pilih gambar</label>
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
        <div className="">
          <button className="btn btn-error" onClick={() => handleResetBtn()}>reset</button>
        </div>
      </div>
    </div>
  )
}

const Heading = () => {
  const [apiKey, setApikey] = useState<string>()
  const [, uploadAtom] = useAtom(uploadFiles, { store })
  const loading = useAtomValue(isLoading, { store })
  const fileList = useAtomValue(fileListAtom, { store })

  useEffect(() => {
    fetch("/key").then(async res => setApikey(await res.text()))
  }, [])

  const generate = () => {
    uploadAtom()
      .then(() => setShowHistory(true))
  }

  return (
    <div className="card shadow-xs bg-base-300 rounded-none sticky top-0 z-50 h-full">
      <div className="card-body flex flex-row justify-between gap-8">
        <div className="flex-4">
          <DirectoryInput />
        </div>
        <div className="flex-3 flex flex-row gap-2 justify-end">
          <div className="flex items-center">
            <p className="text-center">{apiKey}</p>
          </div>
          <div className="divider divider-horizontal"></div>
          {loading && (<span className="loading" />)}
          <div className="flex gap-4 justify-end">
            <button className="btn btn-secondary" disabled={(fileList?.length ?? 0) <= 0 || loading} onClick={() => generate()}>generate</button>
            <button className="btn btn-secondary" disabled={loading} onClick={() => setShowHistory(true)}>lihat hasil</button>
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
          <div className="mask mask-b-from-primary w-full bg-secondary h-32">
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
          <div className="mask mask-b-from-primary w-full bg-secondary h-32">
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
              <td>{props.category}</td>
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
  return (
    <div className="grid grid-cols-6 gap-8 px-16 pb-8">
      <ImageRows />
    </div>
  )
}

const History = () => {
  const generateResult = useAtomValue(generateResultAtom, { store })
  const clearResult = useSetAtom(clearGenerateResult)
  return (
    <div className="absolute z-51 h-full w-full bg-base-300 flex flex-col gap-6">
      <div className="card sticky bg-base-200 top-0 z-52 rounded-none">
        <div className="card-body flex flex-row justify-between gap-4">
          <div>
            <button className="btn btn-error" disabled={generateResult.length <= 0} onClick={() => clearResult()}>hapus</button>
          </div>
          <div className="flex flex-row justify-end gap-4">
            <button className="btn btn-secondary w-fit" disabled={generateResult.length <= 0} onClick={() => generateCsv()}>csv</button>
            <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>kembali</button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-6 p-8">
        <ImageResultRows generateResult={generateResult} />
      </div>
    </div>
  )
}

export function App() {
  const isShowHistory = useAtomValue(showHistory, { store })
  return (
    <div className="flex flex-col mx-auto gap-8">
      <Heading />
      <Main />
      {isShowHistory && <History />}
    </div>
  )
}

export default App
