const categories = {
  "Animals": 1,
  "Buildings and Architecture": 2,
  "Business": 3,
  "Drinks": 4,
  "The Environment": 5,
  "States of Mind": 6,
  "Food": 7,
  "Graphic Resources": 8,
  "Hobbies and Leisure": 9,
  "Industry": 10,
  "Landscapes": 11,
  "Lifestyle": 12,
  "People": 13,
  "Plants and Flowers": 14,
  "Culture and Religion": 15,
  "Science": 16,
  "Social Issues": 17,
  "Sports": 18,
  "Technology": 19,
  "Transport": 20,
  "Travel": 21
} as Record<string, number>

const negativeKeywords = [
  "AI", "vector", "AI-generated", "ui", "ux", "ui/ux", "design", "graphic"
].join(", ")

const CsvHeaders = {
  "adobestock": "Filename,Title,Keywords,Category,Releases",
  "vecteezy": "Filename,Title,Description,Keywords",
  "shutterstock": "Filename,Description,Keywords,Categories"
}

export {
  categories,
  negativeKeywords
}