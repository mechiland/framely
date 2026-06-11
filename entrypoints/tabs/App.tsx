import { useEffect, useState } from "react"

import Overlay from "../content/Overlay"

import "./style.css"

export default function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null)

  useEffect(() => {
    chrome.storage.local.get("framely-screenshot", (result) => {
      const data = result["framely-screenshot"]
      if (typeof data === "string" && data) {
        setScreenshot(data)
        chrome.storage.local.remove("framely-screenshot")
      }
    })
  }, [])

  if (!screenshot) {
    return <div className="fixed inset-0 bg-black/90" />
  }

  return <Overlay screenshotUrl={screenshot} onClose={() => window.close()} />
}
