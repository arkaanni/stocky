import { serve } from "bun"
import indexDev from "../client/index.html"
import indexPrd from "../client/index_prd.html"
import { init } from "../util"
import { apiKey, maskedApiKey, serverStore } from "./store"
import { GoogleGenAI, Type, type GenerateContentConfig, type Part } from "@google/genai"
import { categoriesArr, negativeKeywords, shutterstockCategories } from "../client/constants"

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

const createPrompt = (length: number, startIndex: number) =>
  `You are a microstock metadata expert.
    Analyze these ${length} images in exact sequential order (from 0 to ${length - 1}).
    Generate stock metadata for each image (75-100 letter title, 30-60 words description, first category, second category, and 45-49 keywords).
    Avoid using the words ${negativeKeywords} for the metadata. Avoid repeating words. The first category can be one of
    these ${categoriesArr}. The second category can be one of these ${shutterstockCategories}. The imageIndex starts from ${startIndex}`

const generate = async (files: File[], startIndex: number) => {
  const imageContentParts = await Promise.all(
    files.map(async file => {
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

  return await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      ...imageContentParts,
      createPrompt(files.length, startIndex)
    ],
    config: generateConfig
  })
}

const generateConfig = {
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
            first_category: { type: Type.STRING },
            second_category: { type: Type.STRING },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["imageIndex", "title", "description", "first_category", "second_category", "keywords"],
        },
      },
    },
    required: ["metadata"],
  },
} as GenerateContentConfig

const chunkFiles = (files: File[]) => {
  const chunked = []
  for (let i = 0; i < files.length; i += 10) {
    chunked.push(files.slice(i, i + 10))
  }
  return chunked
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(() => resolve, ms))

const server = serve({
  maxRequestBodySize: 1024 * 1024 * 1024,
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
          const chunked = chunkFiles(formData)
          let startIndex = 0
          let results = []
          for (let i = 0; i < chunked.length; i++) {
            const res = await generate(chunked[i]!, startIndex)
            const parsed = JSON.parse(res.text!)
            results.push(...parsed.metadata)
            startIndex += 10
            delay(1000)
          }

          const result = results.map((item: any) => ({
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

