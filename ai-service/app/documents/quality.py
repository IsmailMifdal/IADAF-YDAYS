"""Image quality, measured before reading: a blurred or dark photo of a passport
is the first reason a file is sent back.
"""

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image, UnidentifiedImageError

# Thresholds tuned for phone photos of A4 or ID-1 documents.
MIN_SHORT_SIDE_PX = 600
DARK_MEAN = 50
BRIGHT_MEAN = 225
# Variance of the Laplacian below which edges are too soft to read text.
BLUR_VARIANCE = 60.0
# Measures run on a reduced copy: stable across camera resolutions, and fast.
_ANALYSIS_SIDE_PX = 1000


@dataclass(frozen=True)
class ImageQuality:
    readable: bool
    width: int = 0
    height: int = 0
    brightness: float = 0.0
    sharpness: float = 0.0

    @property
    def too_small(self) -> bool:
        return min(self.width, self.height) < MIN_SHORT_SIDE_PX

    @property
    def too_dark(self) -> bool:
        return self.brightness < DARK_MEAN

    @property
    def overexposed(self) -> bool:
        return self.brightness > BRIGHT_MEAN

    @property
    def blurred(self) -> bool:
        return self.sharpness < BLUR_VARIANCE


def measure(content: bytes) -> ImageQuality:
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.load()
            width, height = image.size
            gray = image.convert("L")
    except (UnidentifiedImageError, OSError, ValueError):
        return ImageQuality(readable=False)

    gray.thumbnail((_ANALYSIS_SIDE_PX, _ANALYSIS_SIDE_PX))
    pixels = np.asarray(gray, dtype=np.float32)
    if pixels.shape[0] < 3 or pixels.shape[1] < 3:
        return ImageQuality(True, width, height, float(pixels.mean()), 0.0)

    # Discrete Laplacian, without an OpenCV dependency.
    laplacian = (
        pixels[:-2, 1:-1] + pixels[2:, 1:-1] + pixels[1:-1, :-2] + pixels[1:-1, 2:]
        - 4 * pixels[1:-1, 1:-1]
    )
    return ImageQuality(True, width, height, float(pixels.mean()), float(laplacian.var()))
