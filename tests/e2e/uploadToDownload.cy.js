/**
 * uploadToDownload.cy.js - アップロードからダウンロードまでのE2Eテスト
 */

describe('OCR-PDF-Converter E2Eテスト', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  describe('アプリケーション起動', () => {
    it('アプリケーションが正常に表示される', () => {
      cy.get('h1').should('contain', 'OCR検索可能PDF変換');
      cy.get('.upload-area').should('be.visible');
    });

    it('ヘッダーに説明文が表示される', () => {
      cy.get('.app-header p').should(
        'contain',
        'スキャンしたPDFや画像を検索可能なPDFに変換'
      );
    });
  });

  describe('ファイルアップロード', () => {
    it('PDFファイルをアップロードできる', () => {
      // テスト用PDFファイルをアップロード
      cy.fixture('test.pdf', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
          });
        });

      // ファイル情報が表示されることを確認
      cy.get('.file-info').should('be.visible');
      cy.get('.file-info').should('contain', 'test.pdf');
      cy.get('.file-info').should('contain', 'application/pdf');
    });

    it('JPEG画像ファイルをアップロードできる', () => {
      cy.fixture('test.jpg', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.jpg',
            mimeType: 'image/jpeg',
          });
        });

      // 画像からPDF変換の通知が表示されることを確認
      cy.get('.file-info').should('be.visible');
      cy.get('.conversion-notice').should(
        'contain',
        '画像ファイルはPDFに変換されます'
      );
    });

    it('サポートされていないファイルではエラーが表示される', () => {
      cy.fixture('test.txt', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.txt',
            mimeType: 'text/plain',
          });
        });

      // エラーメッセージが表示されることを確認
      cy.get('.error-message').should('be.visible');
      cy.get('.error-message').should(
        'contain',
        'サポートされていないファイル形式'
      );
    });

    it('10MBを超えるファイルではエラーが表示される', () => {
      // 10MBを超える大きなファイルを生成
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      cy.get('input[type="file"]').attachFile({
        fileContent: largeContent,
        fileName: 'large.pdf',
        mimeType: 'application/pdf',
      });

      // エラーメッセージが表示されることを確認
      cy.get('.error-message').should('be.visible');
      cy.get('.error-message').should(
        'contain',
        'ファイルサイズが大きすぎます'
      );
    });
  });

  describe('OCR処理', () => {
    beforeEach(() => {
      // テスト用PDFファイルをアップロード
      cy.fixture('test.pdf', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
          });
        });
    });

    it('OCR変換ボタンが有効になる', () => {
      cy.get('.ocr-button').should('not.be.disabled');
      cy.get('.ocr-button').should('contain', 'OCR変換開始');
    });

    it('OCR処理を開始できる', () => {
      cy.get('.ocr-button').click();

      // 進捗表示が表示されることを確認
      cy.get('.ocr-progress', { timeout: 10000 }).should('be.visible');
      cy.get('.progress-bar-container').should('be.visible');
    });

    it('OCR処理の進捗が表示される', () => {
      cy.get('.ocr-button').click();

      // 進捗パーセンテージが表示されることを確認
      cy.get('.progress-text', { timeout: 10000 }).should('be.visible');
      cy.get('.progress-text').should('match', /\d+%/);

      // ページ情報が表示されることを確認
      cy.get('.page-info').should('be.visible');
    });

    it('OCR処理が完了する', () => {
      cy.get('.ocr-button').click();

      // 完了メッセージが表示されることを確認（タイムアウトを長めに設定）
      cy.get('.download-section', { timeout: 60000 }).should('be.visible');
      cy.get('.download-section').should('contain', '変換が完了しました');
    });
  });

  describe('PDFダウンロード', () => {
    beforeEach(() => {
      // テスト用PDFファイルをアップロードしてOCR処理を実行
      cy.fixture('test.pdf', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
          });
        });

      cy.get('.ocr-button').click();
      cy.get('.download-section', { timeout: 60000 }).should('be.visible');
    });

    it('ダウンロードボタンが表示される', () => {
      cy.get('.download-button').should('be.visible');
      cy.get('.download-button').should('contain', 'ダウンロード');
    });

    it('ダウンロードボタンが有効になる', () => {
      cy.get('.download-button').should('not.be.disabled');
    });

    it('ダウンロードボタンをクリックできる', () => {
      // ダウンロードボタンをクリック
      cy.get('.download-button').click();

      // ダウンロードが開始されることを確認
      // （実際のファイルダウンロードの検証は環境依存のため省略）
    });
  });

  describe('リセット機能', () => {
    it('リセットボタンで初期状態に戻る', () => {
      // ファイルをアップロード
      cy.fixture('test.pdf', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
          });
        });

      cy.get('.file-info').should('be.visible');

      // OCR処理を実行
      cy.get('.ocr-button').click();
      cy.get('.download-section', { timeout: 60000 }).should('be.visible');

      // リセットボタンをクリック
      cy.get('.reset-button').click();

      // 初期状態に戻ることを確認
      cy.get('.upload-area').should('be.visible');
      cy.get('.file-info').should('not.exist');
      cy.get('.download-section').should('not.exist');
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル画面で正常に表示される', () => {
      cy.viewport('iphone-6');
      cy.get('.app-container').should('be.visible');
      cy.get('.upload-area').should('be.visible');
    });

    it('タブレット画面で正常に表示される', () => {
      cy.viewport('ipad-2');
      cy.get('.app-container').should('be.visible');
      cy.get('.upload-area').should('be.visible');
    });
  });

  describe('アクセシビリティ', () => {
    it('キーボードでファイル選択ボタンにフォーカスできる', () => {
      cy.get('.upload-area button').focus();
      cy.focused().should('have.class', 'upload-area')
        .or('be.visible');
    });

    it('ARIA属性が正しく設定されている', () => {
      // ファイルをアップロードしてOCR処理を実行
      cy.fixture('test.pdf', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then((fileContent) => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
          });
        });

      cy.get('.ocr-button').click();

      // 進捗バーのARIA属性を確認
      cy.get('.progress-bar', { timeout: 10000 })
        .parent()
        .should('have.attr', 'role', 'progressbar');
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なPDFファイルでエラーが表示される', () => {
      // 不正なPDFファイルを作成
      const invalidPdf = 'invalid pdf content';
      cy.get('input[type="file"]').attachFile({
        fileContent: invalidPdf,
        fileName: 'invalid.pdf',
        mimeType: 'application/pdf',
      });

      cy.get('.ocr-button').click();

      // エラーメッセージが表示されることを確認
      cy.get('.global-error', { timeout: 10000 }).should('be.visible');
    });
  });
});
