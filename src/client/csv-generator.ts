import { categories } from "./constants"
import type { ImageWithMetadata } from "./store"

const generateCsv = async ({ entries }: { entries: ImageWithMetadata[] }) => {
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

export {
  generateCsv
}