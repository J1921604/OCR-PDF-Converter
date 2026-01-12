import React from 'react';
import { render, screen } from '@testing-library/react';
import { OCRProgress } from '../../src/components/OCRProgress';

describe('OCRProgress', () => {
  test('progress=0 かつ未処理で精度サマリーなしの場合は非表示', () => {
    const { container } = render(
      <OCRProgress isProcessing={false} progress={0} pageInfo={null} accuracySummary={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('完了後(progress=100)でも精度サマリーが表示される', () => {
    const accuracySummary = {
      paddleocr: { avg_confidence: 0.87, total_text_count: 98, pages_processed: 2 },
    };

    render(
      <OCRProgress
        isProcessing={false}
        progress={100}
        pageInfo={null}
        accuracySummary={accuracySummary}
      />
    );

    expect(screen.getByText('OCR処理完了')).toBeInTheDocument();
    expect(screen.getByText('OCR精度サマリー')).toBeInTheDocument();
    expect(screen.getByText('PADDLEOCR')).toBeInTheDocument();
    expect(screen.getByText(/検出テキスト数: 98/)).toBeInTheDocument();
  });

  test('engineが利用不可の場合は理由を表示する', () => {
    const accuracySummary = {
      paddleocr: { avg_confidence: 0, total_text_count: 0, pages_processed: 0, error: 'not installed' },
    };

    render(
      <OCRProgress
        isProcessing={false}
        progress={100}
        pageInfo={null}
        accuracySummary={accuracySummary}
      />
    );

    expect(screen.getByText('PADDLEOCR')).toBeInTheDocument();
    expect(screen.getByText(/利用不可:/)).toBeInTheDocument();
  });
});
