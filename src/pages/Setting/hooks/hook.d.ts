export type draggableLineInitialPoint = { clientX: number; clientY: number }

export type mouseLocation = {
  deg?: number | undefined
  width?: number | undefined
  endDisplayX1?: number | undefined
  endDisplayY1?: number | undefined
}

export type MouseLocationForFrame = {
  rvizX: number
  rvizY: number
}

export type RectInfo = {
  axisX: number
  axisY: number
  width: number
  height: number
}
