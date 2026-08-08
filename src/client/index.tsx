import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./App";
import { Provider } from "jotai";
import { store } from "./store";
import "./style.css"

const elem = document.getElementById("root")!;
const root: Root = createRoot(elem)

root.render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
)


// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
// (import.meta.hot.data.root ??= createRoot(elem)).render(app);
