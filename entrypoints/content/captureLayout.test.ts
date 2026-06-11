import { describe, expect, it } from "vitest"

import {
  FRAME_PADDING,
  getCaptureExportLayout,
  getDisplayedChromeBarHeight,
  getScaledPreviewLayout,
  getToolbarBackgroundPickerState,
  shouldShowBackgroundPicker
} from "./captureLayout"

describe("capture layout", () => {
  it("keeps the existing framed layout as the default", () => {
    const preview = getScaledPreviewLayout({
      areaHeight: 900,
      areaWidth: 1088,
      imageHeight: 768,
      imageWidth: 1024,
      showFrame: true
    })
    const exportLayout = getCaptureExportLayout({
      naturalWidth: 1024,
      sourceOffsetWidth: 1024 + FRAME_PADDING * 2,
      showFrame: true
    })

    expect(shouldShowBackgroundPicker(true)).toBe(true)
    expect(preview.chromeHeight).toBe(36)
    expect(preview.screenshotWidth).toBe(1024)
    expect(preview.screenshotHeight).toBe(768)
    expect(preview.captureWidth).toBeCloseTo(
      preview.frameWidth + FRAME_PADDING * 2
    )
    expect(exportLayout.padding).toBe(FRAME_PADDING)
    expect(exportLayout.width).toBe(1024 + FRAME_PADDING * 2)
  })

  it("exports only the raw captured webpage when the frame is disabled", () => {
    const preview = getScaledPreviewLayout({
      areaHeight: 720,
      areaWidth: 1200,
      imageHeight: 768,
      imageWidth: 1024,
      showFrame: false
    })
    const exportLayout = getCaptureExportLayout({
      naturalWidth: 1024,
      sourceOffsetWidth: preview.captureWidth,
      showFrame: false
    })

    expect(shouldShowBackgroundPicker(false)).toBe(false)
    expect(preview.chromeHeight).toBe(0)
    expect(preview.captureWidth).toBe(preview.frameWidth)
    expect(exportLayout.padding).toBe(0)
    expect(exportLayout.width).toBe(1024)
  })

  it("keeps the background picker slot reserved when the picker is hidden", () => {
    expect(getToolbarBackgroundPickerState(true)).toEqual({
      reserveSpace: true,
      visible: true
    })
    expect(getToolbarBackgroundPickerState(false)).toEqual({
      reserveSpace: true,
      visible: false
    })
  })

  it("provides an animatable chrome bar height", () => {
    expect(getDisplayedChromeBarHeight(1024, true)).toBe(36)
    expect(getDisplayedChromeBarHeight(512, true)).toBe(18)
    expect(getDisplayedChromeBarHeight(1024, false)).toBe(0)
  })

  it("keeps the displayed screenshot aspect ratio stable in both frame modes", () => {
    const framed = getScaledPreviewLayout({
      areaHeight: 900,
      areaWidth: 1100,
      imageHeight: 900,
      imageWidth: 1440,
      showFrame: true
    })
    const raw = getScaledPreviewLayout({
      areaHeight: 900,
      areaWidth: 1100,
      imageHeight: 900,
      imageWidth: 1440,
      showFrame: false
    })

    expect(framed.screenshotWidth / framed.screenshotHeight).toBeCloseTo(
      1440 / 900
    )
    expect(raw.screenshotWidth / raw.screenshotHeight).toBeCloseTo(1440 / 900)
  })
})
