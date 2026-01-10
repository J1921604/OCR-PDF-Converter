// App.jsx - 簡易テスト版
import React from 'react';

export function App() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#333' }}>OCR検索可能PDF変換</h1>
        <p style={{ color: '#666' }}>アプリケーションは正常に起動しました</p>
        <button style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          テストボタン
        </button>
      </div>
    </div>
  );
}
