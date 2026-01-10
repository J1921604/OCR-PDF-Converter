/**
 * coordinateConverter.test.js - 座標変換ユーティリティのテスト
 */

import {
  convertImageCoordsToPDF,
  calculateFontSize,
  convertOCRItemToTextLayerItem,
} from '../../src/utils/coordinateConverter';

describe('coordinateConverter', () => {
  describe('convertImageCoordsToPDF', () => {
    test('画像座標をPDF座標に変換する', () => {
      const result = convertImageCoordsToPDF(
        { x1: 100, y1: 200, x2: 150, y2: 220 },
        1000,
        792
      );

      expect(result.x).toBeCloseTo(79.2, 1); // 100 * 0.792
      expect(result.y).toBeCloseTo(617.76, 1); // 792 - (220 * 0.792) = 792 - 174.24 = 617.76
      expect(result.width).toBeCloseTo(39.6, 1); // 50 * 0.792
      expect(result.height).toBeCloseTo(15.84, 1); // 20 * 0.792
    });

    test('ゼロ座標を変換する', () => {
      const result = convertImageCoordsToPDF(
        { x1: 0, y1: 0, x2: 100, y2: 50 },
        1000,
        792
      );

      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(752.4, 1); // 792 - 50 * 0.792
      expect(result.width).toBeCloseTo(79.2, 1);
      expect(result.height).toBeCloseTo(39.6, 1);
    });

    test('画像高と同じY座標を変換する', () => {
      const result = convertImageCoordsToPDF(
        { x1: 0, y1: 1000, x2: 100, y2: 1050 },
        1000,
        792
      );

      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(-39.6, 1); // 792 - 1050 * 0.792
      expect(result.width).toBeCloseTo(79.2, 1);
      expect(result.height).toBeCloseTo(39.6, 1);
    });

    test('異なるスケール比率で変換する', () => {
      const result = convertImageCoordsToPDF(
        { x1: 200, y1: 300, x2: 300, y2: 350 },
        2000,
        792,
        1500,
        612
      );

      expect(result.x).toBeCloseTo(81.6, 1); // 200 * (612/1500)
      expect(result.y).toBeCloseTo(653.4, 1); // 792 - 350 * (792/2000)
      expect(result.width).toBeCloseTo(40.8, 1);
      expect(result.height).toBeCloseTo(19.8, 1);
    });
  });

  describe('calculateFontSize', () => {
    test('バウンディングボックスの高さからフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 100, height: 20 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(18); // 20 * 0.9
    });

    test('小さいバウンディングボックスでフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 50, height: 10 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(9); // 10 * 0.9
    });

    test('大きいバウンディングボックスでフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 200, height: 50 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(45); // 50 * 0.9
    });

    test('ゼロ高さのバウンディングボックスでフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 100, height: 0 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(6); // minFontSize
    });
  });

  describe('convertOCRItemToTextLayerItem', () => {
    test('OCRアイテムをテキストレイヤーアイテムに変換する', () => {
      const ocrItem = {
        text: 'テスト',
        bbox: { x1: 100, y1: 200, x2: 150, y2: 220 },
        confidence: 0.95,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        792
      );

      expect(result.text).toBe('テスト');
      expect(result.x).toBeCloseTo(79.2, 1);
      expect(result.y).toBeCloseTo(617.76, 1);
      expect(result.width).toBeCloseTo(39.6, 1);
      expect(result.height).toBeCloseTo(15.84, 1);
      expect(result.fontSize).toBeCloseTo(14.256, 1); // 15.84 * 0.9
      expect(result.confidence).toBe(0.95);
    });

    test('空のテキストを持つOCRアイテムを変換する', () => {
      const ocrItem = {
        text: '',
        bbox: { x1: 0, y1: 0, x2: 50, y2: 20 },
        confidence: 0.5,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        792
      );

      expect(result.text).toBe('');
      expect(result.x).toBe(0);
      expect(result.fontSize).toBeCloseTo(14.256, 1); // 15.84 * 0.9
      expect(result.confidence).toBe(0.5);
    });

    test('高い信頼度を持つOCRアイテムを変換する', () => {
      const ocrItem = {
        text: '高精度',
        bbox: { x1: 50, y1: 100, x2: 150, y2: 130 },
        confidence: 0.99,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        792
      );

      expect(result.text).toBe('高精度');
      expect(result.confidence).toBe(0.99);
      expect(result.fontSize).toBeCloseTo(21.384, 1); // 23.76 * 0.9
    });

    test('低い信頼度を持つOCRアイテムを変換する', () => {
      const ocrItem = {
        text: '不明',
        bbox: { x1: 100, y1: 200, x2: 150, y2: 220 },
        confidence: 0.1,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        792
      );

      expect(result.text).toBe('不明');
      expect(result.confidence).toBe(0.1);
    });
  });
});
