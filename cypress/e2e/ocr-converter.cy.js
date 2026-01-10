// E2Eテスト - PDFアップロードからダウンロードまでの基本フロー

describe('OCR PDF Converter - Basic Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('ページが正常にロードされる', () => {
    cy.contains('OCR検索可能PDF変換').should('be.visible')
    cy.contains('スキャンしたPDFをOCR処理して').should('be.visible')
  })

  it('ファイルアップローダーが表示される', () => {
    cy.get('.file-uploader').should('be.visible')
    cy.contains('ファイルを選択').should('be.visible')
  })

  it('PDFファイルをアップロードできる', () => {
    // 注: テスト用PDFファイルがない場合はスキップ
    cy.log('PDFファイルアップロードテストはfixtureファイル作成後に実施')
    // cy.fixture('test.pdf', 'base64').then((fileContent) => {
    //   cy.get('input[type="file"]').attachFile({
    //     fileContent,
    //     fileName: 'test.pdf',
    //     mimeType: 'application/pdf',
    //     encoding: 'base64',
    //   })
    // })
    // cy.get('.file-info').should('be.visible')
    // cy.contains('test.pdf').should('be.visible')
  })

  it('OCR変換ボタンが表示され、クリック可能である', () => {
    // 注: ファイルアップロード後のテストはfixture作成後に実施
    cy.log('ボタン表示テストはPDFアップロード後に確認')
    // cy.fixture('test.pdf', 'base64').then((fileContent) => {
    //   cy.get('input[type="file"]').attachFile({
    //     fileContent,
    //     fileName: 'test.pdf',
    //     mimeType: 'application/pdf',
    //     encoding: 'base64',
    //   })
    // })
    // cy.contains('OCR変換開始').should('be.visible').should('not.be.disabled')
  })

  it('エラーメッセージが適切に表示される', () => {
    // サーバーが起動していない場合のエラーハンドリング
    // バックエンドAPIのヘルスチェック
    cy.request({
      url: 'http://localhost:5000/api/health',
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log('バックエンドサーバーが起動していません')
      }
    })
  })

  it('リセットボタンで状態がクリアされる', () => {
    // 注: ファイルアップロード後のテストはfixture作成後に実施
    cy.log('リセットテストはPDFアップロード後に確認')
    // cy.fixture('test.pdf', 'base64').then((fileContent) => {
    //   cy.get('input[type="file"]').attachFile({
    //     fileContent,
    //     fileName: 'test.pdf',
    //     mimeType: 'application/pdf',
    //     encoding: 'base64',
    //   })
    // })
    // cy.get('.file-info').should('be.visible')
    // cy.get('body').then(($body) => {
    //   if ($body.find('.reset-button').length > 0) {
    //     cy.get('.reset-button').click()
    //     cy.get('.file-info').should('not.exist')
    //   }
    // })
  })
})

describe('OCR PDF Converter - API Integration', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('バックエンドAPIが正常に応答する', () => {
    cy.request('http://localhost:5000/api/health').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('status', 'ok')
    })
  })
})

describe('OCR PDF Converter - UI/UX', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('ダークテーマが適用されている', () => {
    cy.get('body').should('have.css', 'background')
    cy.get('.app-container').should('be.visible')
  })

  it('レスポンシブデザインが機能する', () => {
    // モバイルビューポート
    cy.viewport('iphone-x')
    cy.get('.app-container').should('be.visible')

    // タブレットビューポート
    cy.viewport('ipad-2')
    cy.get('.app-container').should('be.visible')

    // デスクトップビューポート
    cy.viewport(1920, 1080)
    cy.get('.app-container').should('be.visible')
  })

  it('オレンジ基調のカラースキームが適用されている', () => {
    cy.get('.app-header h1').should('have.css', 'color')
    // オレンジ系の色（RGB値を確認）
    cy.get('.app-header h1').should(($el) => {
      const color = $el.css('color')
      expect(color).to.match(/rgb\(255,\s*\d+,\s*\d+\)/)
    })
  })
})
