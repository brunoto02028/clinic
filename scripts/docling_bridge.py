import sys
import json
import os
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter

def process_document(file_path):
    try:
        if not os.path.exists(file_path):
            return {"error": "File not found"}

        converter = DocumentConverter()
        result = converter.convert(file_path)
        
        # Extract content
        content = result.document.export_to_markdown()
        
        # Simple extraction logic (can be expanded)
        analysis = {
            "title": result.document.name or os.path.basename(file_path),
            "text": content,
            "pages": len(result.document.pages) if hasattr(result.document, 'pages') else 1,
            "status": "success"
        }
        
        return analysis
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    result = process_document(file_path)
    print(json.dumps(result))
