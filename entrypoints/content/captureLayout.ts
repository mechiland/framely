export const FRAME_PADDING = 32

const CHROME_BAR_WIDTH = 1024
const CHROME_BAR_HEIGHT = 36

interface PreviewLayoutInput {
  areaHeight: number
  areaWidth: number
  imageHeight: number
  imageWidth: number
  showFrame: boolean
}

interface PreviewLayout {
  captureHeight: number
  captureWidth: number
  chromeHeight: number
  frameHeight: number
  frameWidth: number
  padding: number
  screenshotHeight: number
  screenshotWidth: number
}

interface ExportLayoutInput {
  naturalWidth: number
  sourceOffsetWidth: number
  showFrame: boolean
}

interface ExportLayout {
  padding: number
  scale: number
  width: number
}

export function shouldShowBackgroundPicker(showFrame: boolean) {
  return showFrame
}

export function getToolbarBackgroundPickerState(showFrame: boolean) {
  return {
    reserveSpace: true,
    visible: shouldShowBackgroundPicker(showFrame)
  }
}

export function getDisplayedChromeBarHeight(
  frameWidth: number,
  showFrame: boolean
) {
  return showFrame ? (frameWidth * CHROME_BAR_HEIGHT) / CHROME_BAR_WIDTH : 0
}

export function getScaledPreviewLayout({
  areaHeight,
  areaWidth,
  imageHeight,
  imageWidth,
  showFrame
}: PreviewLayoutInput): PreviewLayout {
  const padding = showFrame ? FRAME_PADDING : 0
  const totalHeightPerWidth =
    imageHeight / imageWidth +
    (showFrame ? CHROME_BAR_HEIGHT / CHROME_BAR_WIDTH : 0)
  const availableWidth = Math.max(0, areaWidth - padding * 2)
  const availableHeight = Math.max(0, areaHeight - padding * 2)
  const widthByHeight = availableHeight / totalHeightPerWidth
  const frameWidth = Math.min(availableWidth, widthByHeight)
  const screenshotWidth = frameWidth
  const screenshotHeight = frameWidth * (imageHeight / imageWidth)
  const chromeHeight = getDisplayedChromeBarHeight(frameWidth, showFrame)
  const frameHeight = screenshotHeight + chromeHeight

  return {
    captureHeight: frameHeight + padding * 2,
    captureWidth: frameWidth + padding * 2,
    chromeHeight,
    frameHeight,
    frameWidth,
    padding,
    screenshotHeight,
    screenshotWidth
  }
}

export function getCaptureExportLayout({
  naturalWidth,
  sourceOffsetWidth,
  showFrame
}: ExportLayoutInput): ExportLayout {
  if (!showFrame) {
    return {
      padding: 0,
      scale: 1,
      width: naturalWidth
    }
  }

  const displayedFrameWidth = Math.max(1, sourceOffsetWidth - FRAME_PADDING * 2)
  const scale = naturalWidth > 0 ? naturalWidth / displayedFrameWidth : 1
  const padding = Math.round(FRAME_PADDING * scale)

  return {
    padding,
    scale,
    width: naturalWidth > 0 ? naturalWidth + padding * 2 : sourceOffsetWidth
  }
}
