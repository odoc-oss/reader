import {  TextRectCoordinate } from '@odoc/pdf-annotate-viewer';

export type PageTextRects = (TextRectCoordinate & {pageNumber: number})[]
