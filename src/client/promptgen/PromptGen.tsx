import {
  ArrowUpRightIcon, ArrowUturnRightIcon, PhotoIcon
} from "@heroicons/react/24/outline"
import { useAtom, useAtomValue } from "jotai"
import { fileAtom, generate, generatedPrompt, imagePreviewUriAtom, loadingAtom, store } from "./store"

const PromptGen = () => {
  const [file, setFile] = useAtom(fileAtom, { store })
  const [previewUri, setPreviewUri] = useAtom(imagePreviewUriAtom, { store })
  const [, generatePrompt] = useAtom(generate, { store })
  const generated = useAtomValue(generatedPrompt)
  const isLoading = useAtomValue(loadingAtom)

  return (
    <div className="flex gap-4 h-screen">
      <div className="flex-3 flex flex-col gap-8 items-center py-16">
        <div className="flex-3 w-1/2 h-full">
          {file ? (
            <div className="card">
              <figure className="max-w-2/3">
                <img className="object-cover" src={previewUri} />
              </figure>
              <div className="card-body">
                <div className="flex-2 flex gap-4 items-center">
                  {file && (
                    <label htmlFor="image-input" className={`btn btn-ghost ${isLoading && 'pointer-events-none'}`}>
                      <ArrowUturnRightIcon width={24} />
                      <p className="text-sm">ganti gambar</p>
                    </label>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => generatePrompt()}
                    disabled={isLoading}
                  >
                    generate
                  </button>
                  {isLoading && (
                    <div>
                      <span className="loading loading-ring" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-gray-500 h-full">
              <div className="card-body w-full flex items-center justify-center">
                <label htmlFor="image-input" className="btn btn-ghost">
                  <PhotoIcon width={24} />
                  <p className="text-sm">pilih gambar</p>
                </label>
              </div>
            </div>
          )}
        </div>
        <input
          id="image-input"
          className="file-input"
          accept=".jpg, .jpeg, .png"
          hidden
          onChange={(e) => {
            if (e.target.files?.length ?? 0 > 0) {
              const img = e.target.files?.item(0)!
              setFile(img)
              if (previewUri) {
                URL.revokeObjectURL(previewUri)
              }
              setPreviewUri(URL.createObjectURL(img))
            }
          }}
          type="file" />

        <div className="flex-1 px-16">
          <p>{generated}</p>
        </div>
      </div>
      <div className="flex-1 py-16">
        <a className={`btn btn-ghost ${isLoading && 'pointer-events-none'}`} href="/">
          <ArrowUpRightIcon width={16} />
          <p className="text-lg">metadata</p>
        </a>
      </div>
    </div>
  )
}

export default PromptGen