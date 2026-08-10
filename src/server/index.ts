import { serve } from "bun"
import indexDev from "../client/index.html"
import indexPrd from "../client/index_prd.html"
import { init } from "../util"
import { apiKey, maskedApiKey, serverStore } from "./store"
import { GoogleGenAI, Type, type Part } from "@google/genai"
import { categoriesArr, negativeKeywords } from "../client/constants"

await init()

const index = process.env.NODE_ENV === "dev" ? indexDev : indexPrd

const ai = new GoogleGenAI({ apiKey: serverStore.get(apiKey) })

const convertEpsToPng = async (file: File) => {
  const tempEps = `./temp_${file.name}`
  const tempPng = `./temp_${file.name}.png`
  await Bun.write(tempEps, file)
  const epsFile = Bun.file(tempEps)
  const gsArgs = [
    'gswin64c.exe',
    '-dNOPAUSE',
    '-dBATCH',
    '-dEPSCrop',             // <-- CRITICAL: Crops page boundaries to the EPS BoundingBox
    '-dUseCropBox',
    '-sDEVICE=png16m',       // Render PNG
    '-r300',                    // DPI resolution
    '-g3840x2160', '-dEPSFitPage',
    `-sOutputFile=${tempPng}`,
    tempEps                 // Path to our temp EPS on disk
  ]

  const proc = Bun.spawn(gsArgs)
  const statusCode = await proc.exited
  if (statusCode === 0) {
    await epsFile.delete()
    return { fileName: file.name, pngPath: tempPng }
  }
  throw new Error(`failed to read .eps file: ${statusCode}`)
}

const server = serve({
  routes: {
    "/*": index,
    "/key": () => {
      const key = serverStore.get(maskedApiKey)
      return new Response(key ? key : "api key not configured")
    },
    "/generate": {
      async POST(req: Bun.BunRequest) {
        try {
          const formData = (await req.formData()).getAll("images") as File[]
          const imageContentParts = await Promise.all(
            formData.map(async file => {
              let toBeProcessed = await file.arrayBuffer()
              let mimeType = file.type
              const data = Buffer.from(toBeProcessed).toBase64()

              return {
                inlineData: {
                  mimeType,
                  data
                }
              } as Part
            })
          )
          const prompt = `You are a microstock metadata expert.
            Analyze these ${formData.length} images in exact sequential order (from 0 to ${formData.length - 1}).
            Generate stock metadata for each image (75-100 letter title, 30-60 words description, category, and 45-49 keywords).
            Avoid using the words ${negativeKeywords} for the metadata. Avoid repeating words. The categories are one of
            these ${categoriesArr}`
          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: [
              ...imageContentParts,
              prompt
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  metadata: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        imageIndex: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category: { type: Type.STRING },
                        keywords: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ["imageIndex", "title", "description", "category", "keywords"],
                    },
                  },
                },
                required: ["metadata"],
              },
            }
          })

          const parsedResponse = JSON.parse(response.text!)
          const result = parsedResponse.metadata.map((item: any) => ({
            fileName: formData[item.imageIndex]?.name ?? `file_${item.imageIndex}`,
            ...item
          }))

          return Response.json(result)
        } catch (e: any) {
          return new Response(e.message ?? null, { status: 500 })
        }
      }
    },
    "/eps": {
      async POST(req: Bun.BunRequest) {
        const epsFiles = (await req.formData()).getAll("eps") as File[]
        const convertedPng = await Promise.all(epsFiles.map(eps => convertEpsToPng(eps)))
        const pngs = convertedPng.map(({ fileName, pngPath }) => {
          const blob = Bun.file(pngPath, { type: "image/png" })
          return new File([blob], fileName, { type: "image/png" })
        })
        const blobData = new FormData()
        pngs.forEach(png => blobData.append("pngs", png, png.name))
        return new Response(blobData)
      }
    }
  },
  development: true,
  port: 3000
})



console.log(`🚀 Server running at ${server.url}`)

