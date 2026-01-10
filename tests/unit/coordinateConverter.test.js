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
        { x: 100, y: 200, width: 50, height: 20 },
        1000,
        612,
        792
      );

      expect(result.x).toBe(61.2);
      expect(result.y).toBe(475.2); // 792 - (200 + 20) * 0.612
      expect(result.width).toBe(30.6);
      expect(result.height).toBe(12.24);
    });

    test('ゼロ座標を変換する', () => {
      const result = convertImageCoordsToPDF(
        { x: 0, y: 0, width: 100, height: 50 },
        1000,
        612,
        792
      );

      expect(result.x).toBe(0);
      expect(result.y).toBe(761.4); // 792 - 50 * 0.612
      expect(result.width).toBe(61.2);
      expect(result.height).toBe(30.6);
    });

    test('画像高と同じY座標を変換する', () => {
      const result = convertImageCoordsToPDF(
        { x: 0, y: 1000, width: 100, height: 50 },
        1000,
        612,
        792
      );

      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(-50.4, 1); // 792 - 1050 * 0.612
      expect(result.width).toBe(61.2);
      expect(result.height).toBe(30.6);
    });

    test('異なるスケール比率で変換する', () => {
      const result = convertImageCoordsToPDF(
        { x: 200, y: 300, width: 100, height: 50 },
        2000,
        612,
        792
      );

      expect(result.x).toBe(61.2); // 200 * 0.306
      expect(result.y).toBe(684.9); // 792 - 350 * 0.306
      expect(result.width).toBe(30.6);
      expect(result.height).toBe(15.3);
    });
  });

  describe('calculateFontSize', () => {
    test('バウンディングボックスの高さからフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 100, height: 20 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(20);
    });

    test('小さいバウンディングボックスでフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 50, height: 10 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(10);
    });

    test('大きいバウンディングボックスでフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 200, height: 50 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(50);
    });

    test('ゼロ高さのバウンディングボックスでフォントサイズを計算する', () => {
      const bbox = { x: 0, y: 0, width: 100, height: 0 };
      const fontSize = calculateFontSize(bbox);
      expect(fontSize).toBe(0);
    });
  });

  describe('convertOCRItemToTextLayerItem', () => {
    test('OCRアイテムをテキストレイヤーアイテムに変換する', () => {
      const ocrItem = {
        text: 'テスト',
        bbox: { x0: 100, y0: 200, x1: 150, y1: 220 },
        confidence: 0.95,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        612,
        792
      );

      expect(result.text).toBe('テスト');
      expect(result.x).toBe(61.2);
      expect(result.y).toBeCloseTo(657.36, 1);
      expect(result.width).toBe(30.6);
      expect(result.height).toBe(12.24);
      expect(result.fontSize).toBe(12.24);
      expect(result.confidence).toBe(0.95);
    });

    test('空のテキストを持つOCRアイテムを変換する', () => {
      const ocrItem = {
        text: '',
        bbox: { x0: 0, y0: 0, x1: 50, y1: 20 },
        confidence: 0.5,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        612,
        792
      );

      expect(result.text).toBe('');
      expect(result.x).toBe(0);
      expect(result.fontSize).toBe(12.24);
      expect(result.confidence).toBe(0.5);
    });

    test('高い信頼度を持つOCRアイテムを変換する', () => {
      const ocrItem = {
        text: '高精度',
        bbox: { x0: 50, y0: 100, x1: 150, y1: 130 },
        confidence: 0.99,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        612,
        792
      );

      expect(result.text).toBe('高精度');
      expect(result.confidence).toBe(0.99);
      expect(result.fontSize).toBe(18.36);
    });

    test('低い信頼度を持つOCRアイテムを変換する', () => {
      const ocrItem = {
        text: '不明',
        bbox: { x0: 100, y0: 200, x1: 150, y1: 220 },
        confidence: 0.1,
      };

      const result = convertOCRItemToTextLayerItem(
        ocrItem,
        1000,
        612,
        792
      );

      expect(result.text).toBe('不明');
      expect(result.confidence).toBe(0.1);
    });
  });
});
