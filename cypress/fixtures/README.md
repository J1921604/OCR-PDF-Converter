# テスト用ダミーファイル

このディレクトリには、Cypressテスト用のテストデータが格納されます。

## 必要なファイル

### test.pdf
テスト用の簡易PDFファイル（日本語テキスト含む、1ページ、A4サイズ）

実際のテストでは、以下のいずれかの方法でtest.pdfを用意してください：

1. **手動作成**: 
   - 簡単なテキストを含むPDFを作成
   - `cypress/fixtures/`に配置

2. **プログラム生成**:
   ```javascript
   // cypress/support/e2e.js などで
   const { jsPDF } = require('jspdf');
   const doc = new jsPDF();
   doc.text('テストPDF', 10, 10);
   doc.save('test.pdf');
   ```

3. **サンプルダウンロード**:
   - 既存のサンプルPDFを使用

## 注意事項

- PDFファイルはgitignoreに追加し、リポジトリにコミットしない
- テストデータは最小限のサイズに保つ（1MB以下推奨）
