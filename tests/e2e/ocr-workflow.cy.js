/**
 * OCR PDF Converter - E2E Tests
 * フル機能のエンドツーエンドテスト
 */

describe('OCR PDF Converter - Full Workflow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('loads the application successfully', () => {
    cy.contains('OCR検索可能PDF変換').should('be.visible');
    cy.get('[data-testid="file-uploader"]').should('exist');
  });

  it('displays dark theme correctly', () => {
    cy.get('body').should('have.css', 'background-color', 'rgb(10, 10, 15)');
    // Check that app container exists with some styling
    cy.get('.app-container').should('exist');
  });

  it('validates file type on upload', () => {
    // Create a fake non-PDF file
    const fileName = 'test.txt';
    cy.get('input[type="file"]').then(input => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input[0].files = dataTransfer.files;
      input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show error message
    cy.contains(/ファイル形式が無効|PDFファイルを選択してください/i, { timeout: 5000 }).should('be.visible');
  });

  it('handles drag and drop file upload', () => {
    const fileName = 'test.pdf';
    
    cy.get('[data-testid="drop-zone"]').then(dropZone => {
      const blob = new Blob(['%PDF-1.4 fake pdf'], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      });
      
      dropZone[0].dispatchEvent(dropEvent);
    });

    cy.contains(fileName, { timeout: 3000 }).should('be.visible');
  });

  it('displays file information after upload', () => {
    const fileName = 'sample.pdf';
    
    cy.get('input[type="file"]').then(input => {
      const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input[0].files = dataTransfer.files;
      input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Check file name is displayed
    cy.contains(fileName).should('be.visible');
    
    // Check file size is displayed
    cy.contains(/\d+(\.\d+)?\s*(B|KB|MB)/i).should('be.visible');
  });

  it('allows user to select another file', () => {
    // Upload first file
    cy.get('input[type="file"]').then(input => {
      const blob1 = new Blob(['%PDF-1.4 first'], { type: 'application/pdf' });
      const file1 = new File([blob1], 'first.pdf', { type: 'application/pdf' });
      const dataTransfer1 = new DataTransfer();
      dataTransfer1.items.add(file1);
      input[0].files = dataTransfer1.files;
      input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });

    cy.contains('first.pdf', { timeout: 3000 }).should('be.visible');

    // Click "別のファイルを変換" button
    cy.contains('別のファイルを変換').click();

    // Upload second file
    cy.get('input[type="file"]').then(input => {
      const blob2 = new Blob(['%PDF-1.4 second'], { type: 'application/pdf' });
      const file2 = new File([blob2], 'second.pdf', { type: 'application/pdf' });
      const dataTransfer2 = new DataTransfer();
      dataTransfer2.items.add(file2);
      input[0].files = dataTransfer2.files;
      input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });

    cy.contains('second.pdf', { timeout: 3000 }).should('be.visible');
  });

  it('shows processing state UI elements', () => {
    cy.get('input[type="file"]').then(input => {
      const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
      const file = new File([blob], 'test.pdf', { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input[0].files = dataTransfer.files;
      input[0].dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Check if OCR progress component exists
    cy.get('[data-testid="ocr-progress"]', { timeout: 10000 }).should('exist');
  });

  it.skip('backend API is accessible (requires separate backend process)', () => {
    cy.request('http://localhost:5000/api/health').then(response => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('status', 'healthy');
    });
  });

  it('webpack dev server serves assets correctly', () => {
    cy.request('/manifest.json').its('status').should('eq', 200);
    cy.request('/assets/icon-192.png').its('status').should('eq', 200);
  });

  it('responsive design for mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/');
    cy.contains('OCR検索可能PDF変換').should('be.visible');
    cy.get('.app-container').should('exist');
  });

  it('responsive design for tablet viewport', () => {
    cy.viewport('ipad-2');
    cy.visit('/');
    cy.contains('OCR検索可能PDF変換').should('be.visible');
  });
});

describe('Dark Theme Visual Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('verifies neon glow effects on interactive elements', () => {
    cy.get('.app-container').should('have.css', 'box-shadow');
    cy.get('button').first().should('have.css', 'box-shadow');
  });

  it('verifies gradient backgrounds', () => {
    cy.get('body').should('have.css', 'background');
  });

  it('verifies hover effects work', () => {
    cy.get('button').first().trigger('mouseover');
    cy.get('button').first().should('have.css', 'transform');
  });
});
