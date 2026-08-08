import { serve } from "bun"
import indexDev from "../client/index.html"
import indexPrd from "../client/index_prd.html"
import { init } from "../util"
import { apiKey, maskedApiKey, serverStore } from "./store"
import { GoogleGenAI, Type, type Part } from "@google/genai"

await init()

const index = process.env.NODE_ENV === "dev" ? indexDev : indexPrd

const ai = new GoogleGenAI({ apiKey: serverStore.get(apiKey) })

const server = serve({
  routes: {
    "/*": index,
    "/key": () => {
      const key = serverStore.get(maskedApiKey)
      return new Response(key ? key : "api key not configured")
    },
    "/start": async (req: Bun.BunRequest) => {
      try {

        const formData = (await req.formData()).getAll("images") as File[]
        const imageContentParts = await Promise.all(
          formData.map(async file => {
            const arrayBuffer = await file.arrayBuffer()
            return {
              inlineData: {
                mimeType: file.type,
                data: Buffer.from(arrayBuffer).toBase64()
              }
            } as Part
          })
        )
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [
            ...imageContentParts,
            `You are a microstock metadata expert.
            Analyze these ${formData.length} images in exact sequential order (from 0 to ${formData.length - 1}).
            Generate stock metadata for each image (title, description, category, and 30-40 keywords).`
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
  development: true,
  port: 3000
})



console.log(`🚀 Server running at ${server.url}`)

