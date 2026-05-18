/*
 * Created Date: April 18th 2022, 4:23:45 pm
 * Author: zhoupengcheng
 * -----
 * Last Modified: April 18th 2022, 4:23:45 pm
 */

import { ViewerController } from '@odoc/pdf-annotate-viewer';
import { renderThumbnail } from '@odoc/pdf-annotate-core/render/renderThumbnail';
import { PDFJSAnnotate } from '@odoc/pdf-annotate-core';

export const setAnnotateThumbnails = (
  pdfViewer?: ViewerController,
  pdfAnnotater?: PDFJSAnnotate
) => {
  const thumbnailViewer = pdfViewer?.getThumbnailViewer();

  pdfAnnotater?.svgElements.forEach(async (item, index) => {
    const url = await renderThumbnail(item);
    thumbnailViewer?.setAnnotateImage({
      pageIndex: index,
      imgUrl: url,
    });
  });
};
