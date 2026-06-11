import html2canvas from "html2canvas"
import { useEffect, useRef, useState } from "react"

import {
  FRAME_PADDING,
  getCaptureExportLayout,
  getScaledPreviewLayout,
  getToolbarBackgroundPickerState,
  shouldShowBackgroundPicker
} from "./captureLayout"

interface OverlayProps {
  screenshotUrl: string
  onClose: () => void
}

// Inline gradients/solids using hex/rgb so html2canvas can parse them.
// Tailwind v4 emits oklch() colors which html2canvas cannot read and would
// render transparent — keep all preset values in hex/rgb form.
interface BackgroundPreset {
  id: string
  name: string
  css: string
}

const BACKGROUNDS: BackgroundPreset[] = [
  {
    id: "mint-lavender",
    name: "Mint → Lavender",
    css: "linear-gradient(to right, #86efac, #c084fc)"
  },
  {
    id: "sunset",
    name: "Sunset",
    css: "linear-gradient(135deg, #ff9a9e, #fad0c4)"
  },
  {
    id: "peach",
    name: "Peach",
    css: "linear-gradient(135deg, #ffecd2, #fcb69f)"
  },
  {
    id: "rose",
    name: "Rose",
    css: "linear-gradient(135deg, #ff758c, #ff7eb3)"
  },
  {
    id: "lavender-pink",
    name: "Lavender Pink",
    css: "linear-gradient(135deg, #a18cd1, #fbc2eb)"
  },
  {
    id: "indigo-violet",
    name: "Indigo Violet",
    css: "linear-gradient(135deg, #6366f1, #a855f7)"
  },
  {
    id: "ocean",
    name: "Ocean",
    css: "linear-gradient(135deg, #2193b0, #6dd5ed)"
  },
  {
    id: "teal-sky",
    name: "Teal Sky",
    css: "linear-gradient(135deg, #0ea5e9, #22d3ee)"
  },
  {
    id: "mint-sky",
    name: "Mint Sky",
    css: "linear-gradient(135deg, #a1ffce, #faffd1)"
  },
  {
    id: "forest",
    name: "Forest",
    css: "linear-gradient(135deg, #134e5e, #71b280)"
  },
  {
    id: "sunrise",
    name: "Sunrise",
    css: "linear-gradient(135deg, #f6d365, #fda085)"
  },
  {
    id: "deep-night",
    name: "Deep Night",
    css: "linear-gradient(135deg, #0f2027, #2c5364)"
  },
  {
    id: "white",
    name: "White",
    css: "linear-gradient(#ffffff, #ffffff)"
  },
  {
    id: "soft-gray",
    name: "Soft Gray",
    css: "linear-gradient(#f3f4f6, #f3f4f6)"
  },
  {
    id: "charcoal",
    name: "Charcoal",
    css: "linear-gradient(#1f2937, #1f2937)"
  }
]

const DEFAULT_BG = BACKGROUNDS[0]

export default function Overlay({ screenshotUrl, onClose }: OverlayProps) {
  const [showFrame, setShowFrame] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [selectedBg, setSelectedBg] = useState<BackgroundPreset>(DEFAULT_BG)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const pickerButtonRef = useRef<HTMLButtonElement>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [areaSize, setAreaSize] = useState<{ w: number; h: number } | null>(
    null
  )
  const captureRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)

  // Compute the largest frame size that fits within the available area
  // (after subtracting the gradient box padding) while preserving aspect.
  const previewLayout =
    imgSize && areaSize
      ? getScaledPreviewLayout({
          areaHeight: areaSize.h,
          areaWidth: areaSize.w,
          imageHeight: imgSize.h,
          imageWidth: imgSize.w,
          showFrame
        })
      : null
  const frameW = previewLayout?.frameWidth ?? 0
  const frameH = previewLayout?.frameHeight ?? 0
  const captureW = previewLayout?.captureWidth ?? 0
  const captureH = previewLayout?.captureHeight ?? 0
  const screenshotW = previewLayout?.screenshotWidth ?? 0
  const screenshotH = previewLayout?.screenshotHeight ?? 0
  const capturePadding =
    previewLayout?.padding ?? (showFrame ? FRAME_PADDING : 0)
  const chromeBarHeight = previewLayout?.chromeHeight ?? 0
  const backgroundPickerState = getToolbarBackgroundPickerState(showFrame)

  // Observe the available area inside captureRef (excluding its p-8 padding
  // is automatic because we measure the inner area element directly).
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect
        setAreaSize({ w: cr.width, h: cr.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // close on ESC (close picker first if open, otherwise close overlay)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (pickerOpen) {
        setPickerOpen(false)
      } else {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, pickerOpen])

  // close picker on outside click
  useEffect(() => {
    if (!showFrame) setPickerOpen(false)
  }, [showFrame])

  useEffect(() => {
    if (!pickerOpen) return
    const handleDown = (e: MouseEvent) => {
      // We're inside a Shadow DOM (content script), so window-level events
      // get retargeted to the shadow host. Use composedPath() to see the
      // real element chain across the shadow boundary.
      const path = e.composedPath()
      if (pickerRef.current && path.includes(pickerRef.current)) return
      if (pickerButtonRef.current && path.includes(pickerButtonRef.current))
        return
      setPickerOpen(false)
    }
    window.addEventListener("mousedown", handleDown, true)
    return () => window.removeEventListener("mousedown", handleDown, true)
  }, [pickerOpen])

  const captureRawScreenshotCanvas = (): HTMLCanvasElement | null => {
    const source = captureRef.current
    const sourceImg = source?.querySelector("img")
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

  // Capture the screenshot-container with gradient background.
  // html2canvas does not traverse Shadow DOM, so we temporarily clone the
  // node into the light DOM along with the shadow root's <style> tags,
  // capture it, then remove it.
  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!showFrame) return captureRawScreenshotCanvas()

    const source = captureRef.current
    if (!source) return null

    const root = source.getRootNode()
    const styleNodes: Node[] =
      root instanceof ShadowRoot
        ? Array.from(
            root.querySelectorAll("style, link[rel='stylesheet']")
          ).map((n) => n.cloneNode(true))
        : []

    const clone = source.cloneNode(true) as HTMLDivElement

    // Use the screenshot's natural dimensions so the exported image keeps
    // its original resolution instead of the on-screen (possibly downscaled)
    // size. Scale the gradient padding so it looks visually identical to
    // what the user sees on screen (where padding is 32px relative to the
    // displayed frame width).
    const sourceImg = source.querySelector("img")
    const naturalWidth = sourceImg?.naturalWidth ?? 0
    // Displayed frame width = clone root contentBox width = offsetWidth - 64.
    const exportLayout = getCaptureExportLayout({
      naturalWidth,
      sourceOffsetWidth: source.offsetWidth,
      showFrame
    })
    const capturePadding = exportLayout.padding
    const captureWidth = exportLayout.width

    // Override sizing on the cloned root so it lays out at full natural size.
    clone.style.width = `${captureWidth}px`
    clone.style.maxWidth = "none"
    clone.style.maxHeight = "none"
    clone.style.height = "auto"
    clone.style.flex = "none"
    clone.style.padding = `${capturePadding}px`
    // Strip the on-screen sizing we applied to the framed box (aspect-ratio,
    // width:100%, height:100%, container-query units). In the off-screen
    // wrapper the parent height is auto, so height:100% would collapse to 0
    // and the captured PNG would lose padding + gradient + image.
    clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
      el.style.maxHeight = "none"
      el.style.maxWidth = "none"
      el.style.aspectRatio = ""
      el.style.containerType = ""
      // Reset width/height we set inline (don't touch elements without inline styles).
      if (el.style.width) el.style.width = "100%"
      if (el.style.height) el.style.height = "auto"
      if (el.tagName === "IMG") {
        el.style.height = "auto"
        el.style.width = "100%"
        el.style.flex = "none"
      }
    })

    const wrapper = document.createElement("div")
    wrapper.style.cssText = [
      "position: fixed",
      "top: 0",
      "left: -100000px",
      "z-index: -1",
      "pointer-events: none",
      `width: ${captureWidth}px`
    ].join(";")
    styleNodes.forEach((s) => wrapper.appendChild(s))
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    try {
      const canvas = await html2canvas(clone, {
        allowTaint: true,
        useCORS: true,
        logging: false,
        scale: 2,
        backgroundColor: null
      })
      return canvas
    } finally {
      wrapper.remove()
    }
  }

  const downloadImage = async () => {
    try {
      const canvas = await captureCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = imgData
      link.download = `framely-${new Date().getTime()}.png`
      link.click()
    } catch (error) {
      console.error("Failed to download:", error)
      alert("Download failed, please try again")
    }
  }

  const copyToClipboard = async () => {
    try {
      const canvas = await captureCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL("image/png")
      const blob = await (await fetch(imgData)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ])
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      alert("Copy failed, please try right-clicking the image to copy manually")
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] box-border flex flex-col items-center justify-start overflow-hidden bg-black/90 p-8 font-sans">
      <div className="relative box-border flex min-h-0 w-full max-w-full flex-1 flex-col rounded-xl">
        <div
          ref={areaRef}
          className="flex min-h-0 w-full max-h-full max-w-full flex-1 items-center justify-center overflow-hidden">
          <div
            ref={captureRef}
            className={
              showFrame
                ? "flex items-center justify-center overflow-hidden rounded-lg transition-[width,height,padding,background-image,border-radius] duration-300 ease-out"
                : "flex items-center justify-center overflow-hidden rounded-none transition-[width,height,padding,background-image,border-radius] duration-300 ease-out"
            }
            style={{
              backgroundImage: showFrame ? selectedBg.css : undefined,
              padding: `${capturePadding}px`,
              ...(frameW > 0
                ? {
                    width: `${captureW}px`,
                    height: `${captureH}px`
                  }
                : { visibility: "hidden" })
            }}>
            <div
              className={
                showFrame
                  ? "relative z-1 flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition-[width,height,border-radius,box-shadow] duration-300 ease-out"
                  : "relative z-1 flex flex-col overflow-hidden rounded-none bg-white shadow-none transition-[width,height,border-radius,box-shadow] duration-300 ease-out"
              }
              style={
                frameW > 0
                  ? { width: `${frameW}px`, height: `${frameH}px` }
                  : undefined
              }>
              <div
                className="shrink-0 overflow-hidden transition-[height,opacity] duration-300 ease-out"
                style={{
                  height: `${chromeBarHeight}px`,
                  opacity: showFrame ? 1 : 0
                }}
                aria-hidden={!showFrame}>
                <svg
                  className="block h-full w-full"
                  viewBox="0 0 1024 36"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M0 8C0 3.58172 3.58172 0 8 0H1016C1020.42 0 1024 3.58172 1024 8V36H0V8Z"
                    fill="#F2F2F2"
                  />
                  <circle cx="24" cy="18" r="6" fill="#FF5F56" />
                  <circle cx="46" cy="18" r="6" fill="#FFBD2E" />
                  <circle cx="68" cy="18" r="6" fill="#27C93F" />
                  <rect
                    x="162"
                    y="8"
                    width="700"
                    height="20"
                    rx="10"
                    fill="white"
                  />
                </svg>
              </div>
              <img
                src={screenshotUrl}
                alt="page screenshot"
                className="block min-h-0 bg-white transition-[width,height] duration-300 ease-out"
                style={
                  screenshotW > 0
                    ? { width: `${screenshotW}px`, height: `${screenshotH}px` }
                    : undefined
                }
                onLoad={(e) => {
                  const t = e.currentTarget
                  setImgSize({ w: t.naturalWidth, h: t.naturalHeight })
                }}
              />
            </div>
          </div>
        </div>

        {showNotification && (
          <div className="fixed left-1/2 top-5 z-[2147483647] -translate-x-1/2 animate-[slideDown_0.3s_ease-out] rounded bg-neutral-800 px-6 py-3 text-sm text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            Copied to clipboard!
          </div>
        )}
      </div>

      <div className="relative z-10 mt-3 shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 px-4">
        {shouldShowBackgroundPicker(showFrame) && pickerOpen && (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-1/2 z-[2147483647] mb-3 -translate-x-1/2 rounded-xl border border-white/10 bg-neutral-900/95 p-3 shadow-[0_10px_25px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="grid grid-cols-5 gap-2">
              {BACKGROUNDS.map((bg) => {
                const active = bg.id === selectedBg.id
                return (
                  <button
                    key={bg.id}
                    type="button"
                    title={bg.name}
                    aria-label={bg.name}
                    onClick={() => {
                      setSelectedBg(bg)
                      setPickerOpen(false)
                    }}
                    className={
                      "h-9 w-9 cursor-pointer rounded-full border border-white/20 transition hover:scale-105 " +
                      (active
                        ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900"
                        : "")
                    }
                    style={{ backgroundImage: bg.css }}
                  />
                )
              })}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          {/* <div className="flex flex-col items-start">
            <a
              href="https://chromewebstore.google.com/detail/framely/hgmdobenglfkhkibfipobpplnmbobnbi"
              target="_blank"
              rel="noreferrer"
              className=" text-sm text-white  ">
              Framely
            </a>
          </div> */}
          <div className="flex items-center gap-3">
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded bg-white/5 px-3 text-sm text-white hover:bg-white/10">
              <input
                type="checkbox"
                className="h-4 w-4 accent-white"
                checked={showFrame}
                onChange={(e) => setShowFrame(e.currentTarget.checked)}
              />
              <span>Frame</span>
            </label>
            {backgroundPickerState.reserveSpace && (
              <div
                className={
                  "relative z-10 " +
                  (backgroundPickerState.visible
                    ? ""
                    : "invisible pointer-events-none")
                }>
                <button
                  ref={pickerButtonRef}
                  className="flex h-8 cursor-pointer items-center gap-2 rounded border-none bg-white/5 px-3 text-sm text-white hover:bg-white/10"
                  onClick={() => setPickerOpen((v) => !v)}
                  aria-label="Change background"
                  aria-expanded={pickerOpen}
                  aria-hidden={!backgroundPickerState.visible}
                  disabled={!backgroundPickerState.visible}
                  tabIndex={backgroundPickerState.visible ? 0 : -1}>
                  <span
                    className="block h-4 w-4 rounded-full border border-white/30"
                    style={{ backgroundImage: selectedBg.css }}
                  />
                  <span>Background</span>
                </button>
              </div>
            )}
            <button
              className="cursor-pointer rounded border-none bg-white/5 px-4 h-8 text-sm text-white hover:bg-white/10"
              onClick={copyToClipboard}>
              Copy
            </button>
            <button
              className="cursor-pointer rounded border-none bg-white/5 px-4 h-8 text-sm text-white hover:bg-white/10"
              onClick={downloadImage}>
              Download
            </button>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-lg leading-none text-gray-500 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close">
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
