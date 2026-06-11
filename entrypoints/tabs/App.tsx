import html2canvas from "html2canvas"
import { useEffect, useRef, useState } from "react"

import "./style.css"

export default function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [showFrame, setShowFrame] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const captureRawScreenshotCanvas = (): HTMLCanvasElement | null => {
    const sourceImg = containerRef.current?.querySelector("img")
    if (
      !sourceImg ||
      sourceImg.naturalWidth <= 0 ||
      sourceImg.naturalHeight <= 0
    ) {
      return null
    }

    const canvas = document.createElement("canvas")
    canvas.width = sourceImg.naturalWidth
    canvas.height = sourceImg.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(
      sourceImg,
      0,
      0,
      sourceImg.naturalWidth,
      sourceImg.naturalHeight
    )
    return canvas
  }

  useEffect(() => {
    // get screenshot data from chrome.storage.local (set by background)
    chrome.storage.local.get("framely-screenshot", (result) => {
      const screenshotData = result["framely-screenshot"]
      if (typeof screenshotData === "string" && screenshotData) {
        setScreenshot(screenshotData)
        chrome.storage.local.remove("framely-screenshot")
      }
    })
  }, [])

  // download image with frame if enabled
  const downloadImage = async () => {
    if (!screenshot) return

    try {
      const canvas = showFrame
        ? await html2canvas(
            containerRef.current?.parentElement || document.body,
            {
              allowTaint: true,
              useCORS: true,
              logging: false,
              scale: 2, // Higher quality
              backgroundColor: null // Allow background to show through
            }
          )
        : captureRawScreenshotCanvas()
      if (!canvas) return

      // Get image data from canvas
      const imgData = canvas.toDataURL("image/png")

      // Download the image
      const link = document.createElement("a")
      link.href = imgData
      link.download = `framely-${new Date().getTime()}.png`
      link.click()
    } catch (error) {
      console.error("Failed to download:", error)
      alert("Download failed, please try again")
    }
  }

  // Copy the entire framed screenshot to clipboard
  const copyToClipboard = async () => {
    if (!containerRef.current) return

    try {
      const canvas = showFrame
        ? await html2canvas(
            containerRef.current?.parentElement || document.body,
            {
              allowTaint: true,
              useCORS: true,
              logging: false,
              scale: 2, // Higher quality
              backgroundColor: null // Allow background to show through
            }
          )
        : captureRawScreenshotCanvas()
      if (!canvas) return

      // Get image data from canvas
      const imgData = canvas.toDataURL("image/png")

      // Copy to clipboard
      const blob = await (await fetch(imgData)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ])

      // Show notification
      setShowNotification(true)
      setTimeout(() => {
        setShowNotification(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      alert("Copy failed, please try right-clicking the image to copy manually")
    }
  }

  // toggle frame visibility
  const toggleFrame = () => {
    setShowFrame(!showFrame)
  }

  return (
    <div className="mx-auto max-w-[1200px] p-5 font-sans">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex flex-col items-start">
          <h1 className="m-0 text-2xl font-semibold text-blue-600">Framely</h1>
          <span className="mt-0.5 text-sm text-gray-500">
            Stylish Browser Frames
          </span>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={showFrame}
              onChange={toggleFrame}
            />
            <span>Frame</span>
          </label>
          <button
            className="cursor-pointer rounded border-none bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={copyToClipboard}>
            Copy
          </button>
          <button
            className="cursor-pointer rounded border-none bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={downloadImage}>
            Download
          </button>
        </div>
      </header>

      <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-lg bg-[radial-gradient(circle,var(--color-white)_0%,var(--color-blue-300)_100%)] p-8">
        {screenshot ? (
          <div
            ref={containerRef}
            className={
              showFrame
                ? "relative z-[1] mx-auto flex w-[1024px] max-w-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_10px_25px_rgba(0,0,0,0.15)]"
                : "relative z-[1] mx-auto flex w-[1024px] max-w-full flex-col overflow-hidden bg-white"
            }>
            {showFrame && (
              <div className="flex flex-col">
                <svg
                  className="shrink-0"
                  width="1024"
                  height="36"
                  viewBox="0 0 1024 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  {/* browser top bar background */}
                  <path
                    d="M0 8C0 3.58172 3.58172 0 8 0H1016C1020.42 0 1024 3.58172 1024 8V36H0V8Z"
                    fill="#F2F2F2"
                  />

                  {/* window control buttons */}
                  <circle cx="24" cy="18" r="6" fill="#FF5F56" />
                  <circle cx="46" cy="18" r="6" fill="#FFBD2E" />
                  <circle cx="68" cy="18" r="6" fill="#27C93F" />

                  {/* address bar */}
                  <rect
                    x="162"
                    y="8"
                    width="700"
                    height="20"
                    rx="10"
                    fill="white"
                  />
                </svg>

                {/* screenshot content */}
                <img
                  src={screenshot}
                  alt="page screenshot"
                  className="block h-auto w-full bg-white"
                />
              </div>
            )}

            {!showFrame && (
              <img
                src={screenshot}
                alt="page screenshot"
                className="block h-auto max-w-full bg-white"
              />
            )}
          </div>
        ) : (
          <div className="p-10 text-base text-gray-500">
            loading screenshot...
          </div>
        )}
      </div>
      <p className="mt-6 text-center">
        <a
          href="https://chromewebstore.google.com/detail/framely/hgmdobenglfkhkibfipobpplnmbobnbi"
          target="_blank"
          className="inline-block rounded px-4 py-2 text-sm text-blue-600 no-underline transition-all hover:bg-blue-600/10 hover:underline">
          Home page
        </a>
      </p>
      {showNotification && (
        <div className="fixed left-1/2 top-5 z-[1000] -translate-x-1/2 animate-[slideDown_0.3s_ease-out] rounded bg-neutral-800 px-6 py-3 text-sm text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          Copied to clipboard!
        </div>
      )}
    </div>
  )
}
