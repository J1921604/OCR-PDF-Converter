"""
Flask APIサーバー
フロントエンドからのOCR処理リクエストを受け付けてPython OCRエンジンを実行
"""
import os
import tempfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from main import process_pdf

app = Flask(__name__)
CORS(app)  # CORS有効化

# 一時ファイル保存用ディレクトリ
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB制限


def allowed_file(filename):
    """ファイル拡張子チェック"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/health', methods=['GET'])
def health_check():
    """ヘルスチェックエンドポイント"""
    return jsonify({
        "status": "ok",
        "message": "OCR API Server is running"
    })


@app.route('/api/ocr/process', methods=['POST'])
def ocr_process():
    """
    OCR処理エンドポイント
    
    リクエスト:
        - file: PDFファイル（multipart/form-data）
        - dpi: 解像度（オプション、デフォルト300）
        - confidence_threshold: 信頼度閾値（オプション、デフォルト0.5）
        
    レスポンス:
        - success: 成功/失敗
        - file_id: 処理済みファイルID
        - pages_processed: 処理ページ数
    """
    try:
        # ファイルの検証
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "ファイルが送信されていません"
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "ファイル名が空です"
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": "PDFファイルのみ対応しています"
            }), 400
        
        # パラメータ取得
        dpi = int(request.form.get('dpi', 300))
        confidence_threshold = float(request.form.get('confidence_threshold', 0.5))
        
        # ファイル保存
        filename = secure_filename(file.filename)
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], f"input_{filename}")
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"output_{filename}")
        
        file.save(input_path)
        print(f"[API] ファイル受信: {filename}")
        
        # OCR処理実行
        result = process_pdf(
            input_path,
            output_path,
            dpi=dpi,
            confidence_threshold=confidence_threshold
        )
        
        # 一時ファイル削除
        if os.path.exists(input_path):
            os.remove(input_path)
        
        if result["success"]:
            return jsonify({
                "success": True,
                "file_id": os.path.basename(output_path),
                "pages_processed": result["pages_processed"],
                "message": "OCR処理が完了しました"
            })
        else:
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 500
            
    except Exception as e:
        print(f"[API エラー] {str(e)}")
        return jsonify({
            "success": False,
            "error": f"サーバーエラー: {str(e)}"
        }), 500


@app.route('/api/ocr/download/<file_id>', methods=['GET'])
def download_file(file_id):
    """
    処理済みPDFダウンロードエンドポイント
    
    パラメータ:
        file_id: ファイルID
    """
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
        
        if not os.path.exists(file_path):
            return jsonify({
                "success": False,
                "error": "ファイルが見つかりません"
            }), 404
        
        # ファイル送信後に削除
        def cleanup():
            if os.path.exists(file_path):
                os.remove(file_path)
        
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=file_id.replace("output_", "searchable_")
        )
        
        # レスポンス送信後にクリーンアップ
        # Flaskの after_this_request を使用
        @app.after_request
        def after(response):
            cleanup()
            return response
        
        return response
        
    except Exception as e:
        print(f"[API エラー] {str(e)}")
        return jsonify({
            "success": False,
            "error": f"ダウンロードエラー: {str(e)}"
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("OCR検索可能PDF変換 APIサーバー")
    print("=" * 60)
    print("サーバー起動中...")
    print("URL: http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
