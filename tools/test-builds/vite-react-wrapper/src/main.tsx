// Make sure newrelic is the first thing imported
// import {agent} from "./newrelic";

// console.log("call traceFn...")
// @ts-ignore: Unreachable code error
//   window.newrelic.traceFn()

import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(<App />);
