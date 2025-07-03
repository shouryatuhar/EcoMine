#!/bin/bash

# Install required packages if not already installed
echo "Installing required packages..."
pip install markdown2pdf
pip install python-pptx
pip install pandoc

# Convert markdown to PDF
echo "Converting Ecomine_Final_Report.md to PDF..."
pandoc Ecomine_Final_Report.md -o Ecomine_Final_Report.pdf --pdf-engine=xelatex -V geometry:margin=1in

# Convert markdown to PowerPoint
echo "Converting Ecomine_Presentation.md to PowerPoint..."
pandoc Ecomine_Presentation.md -o Ecomine_Presentation.pptx --slide-level=3

echo "Conversion complete!"
echo "Generated files:"
echo "- Ecomine_Final_Report.pdf"
echo "- Ecomine_Presentation.pptx" 