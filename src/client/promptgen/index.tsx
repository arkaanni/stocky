import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import PromptGen from "./PromptGen"
import { Provider } from "jotai"
import { store } from "./store"

const elem = document.getElementById("root")!
const root: Root = createRoot(elem)

root.render(
  <StrictMode>
    <Provider store={store}>
      <PromptGen />
    </Provider>
  </StrictMode>
)