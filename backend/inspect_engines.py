import os
import inspect

os.environ['DISABLE_MODEL_SOURCE_CHECK'] = '1'

print('--- PaddleOCR ---')
from paddleocr import PaddleOCR
print('PaddleOCR signature:', inspect.signature(PaddleOCR))

print('\n--- OnnxOCR ---')
from onnxocr.onnx_paddleocr import ONNXPaddleOcr
print('ONNXPaddleOcr signature:', inspect.signature(ONNXPaddleOcr))
