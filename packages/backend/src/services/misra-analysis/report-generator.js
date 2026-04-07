"use strict";
/**
 * Report Generator for MISRA Analysis Results
 * Generates PDF reports with executive summary and detailed violations
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class ReportGenerator {
    /**
     * Generate PDF report for MISRA analysis results
     * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    async generatePDF(analysisResult, fileName) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                });
                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                // Generate report content
                this.addTitlePage(doc, fileName);
                this.addExecutiveSummary(doc, analysisResult); // Requirement 8.1, 8.2, 8.3
                this.addDetailedViolations(doc, analysisResult); // Requirement 8.4, 8.5
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Add title page to the report
     */
    addTitlePage(doc, fileName) {
        doc
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('MISRA Compliance Report', { align: 'center' });
        doc.moveDown(2);
        doc
            .fontSize(16)
            .font('Helvetica')
            .text(`File: ${fileName}`, { align: 'center' });
        doc.moveDown(1);
        doc
            .fontSize(12)
            .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(3);
        doc
            .fontSize(10)
            .font('Helvetica-Oblique')
            .text('MISRA Platform - Static Code Analysis', { align: 'center' });
        doc.addPage();
    }
    /**
     * Add executive summary section
     * Requirements: 8.1, 8.2, 8.3
     * - 8.1: Include executive summary section
     * - 8.2: Show compliance percentage
     * - 8.3: Show severity breakdown
     */
    addExecutiveSummary(doc, analysisResult) {
        doc
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('Executive Summary', { underline: true });
        doc.moveDown(1);
        // Compliance percentage (Requirement 8.2)
        const compliance = analysisResult.summary.compliancePercentage;
        const complianceColor = this.getComplianceColor(compliance);
        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .fillColor(complianceColor)
            .text(`Compliance: ${compliance.toFixed(2)}%`);
        doc.fillColor('black');
        doc.moveDown(1);
        // Total violations
        doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Total Violations: ${analysisResult.summary.totalViolations}`);
        doc.moveDown(1);
        // Severity breakdown (Requirement 8.3)
        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Violations by Severity:');
        doc.moveDown(0.5);
        doc
            .fontSize(12)
            .font('Helvetica')
            .fillColor('#DC2626')
            .text(`  • Mandatory: ${analysisResult.summary.criticalCount}`, { continued: false });
        doc
            .fillColor('#F59E0B')
            .text(`  • Required: ${analysisResult.summary.majorCount}`, { continued: false });
        doc
            .fillColor('#3B82F6')
            .text(`  • Advisory: ${analysisResult.summary.minorCount}`, { continued: false });
        doc.fillColor('black');
        doc.moveDown(1);
        // Overall assessment
        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Overall Assessment:');
        doc.moveDown(0.5);
        const assessment = this.getAssessment(compliance);
        doc
            .fontSize(12)
            .font('Helvetica')
            .text(assessment, { align: 'justify' });
        doc.addPage();
    }
    /**
     * Add detailed violations section
     * Requirements: 8.4, 8.5
     * - 8.4: Group violations by severity
     * - 8.5: Include code snippets
     */
    addDetailedViolations(doc, analysisResult) {
        doc
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('Detailed Violations', { underline: true });
        doc.moveDown(1);
        if (analysisResult.violations.length === 0) {
            doc
                .fontSize(12)
                .font('Helvetica')
                .text('No violations found. Code is fully compliant!', { align: 'center' });
            return;
        }
        // Group violations by severity (Requirement 8.4)
        const grouped = this.groupBySeverity(analysisResult.violations);
        // Mandatory violations
        if (grouped.mandatory.length > 0) {
            this.addViolationSection(doc, 'Mandatory Violations', grouped.mandatory, '#DC2626');
        }
        // Required violations
        if (grouped.required.length > 0) {
            this.addViolationSection(doc, 'Required Violations', grouped.required, '#F59E0B');
        }
        // Advisory violations
        if (grouped.advisory.length > 0) {
            this.addViolationSection(doc, 'Advisory Violations', grouped.advisory, '#3B82F6');
        }
    }
    /**
     * Add a section for violations of a specific severity
     */
    addViolationSection(doc, title, violations, color) {
        doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor(color)
            .text(title);
        doc.fillColor('black');
        doc.moveDown(0.5);
        doc
            .fontSize(10)
            .font('Helvetica')
            .text(`Total: ${violations.length} violation(s)`);
        doc.moveDown(1);
        violations.forEach((violation, index) => {
            // Check if we need a new page
            if (doc.y > 650) {
                doc.addPage();
            }
            // Violation header
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text(`${index + 1}. Rule ${violation.ruleId}: ${violation.ruleName}`);
            doc.moveDown(0.3);
            // Location
            doc
                .fontSize(10)
                .font('Helvetica')
                .text(`Location: Line ${violation.line}, Column ${violation.column}`);
            doc.moveDown(0.3);
            // Message
            doc
                .fontSize(10)
                .font('Helvetica')
                .text(`Message: ${violation.message}`, { align: 'justify' });
            doc.moveDown(0.5);
            // Code snippet (Requirement 8.5)
            doc
                .fontSize(9)
                .font('Courier')
                .fillColor('#374151')
                .text('Code Snippet:', { continued: false });
            doc.moveDown(0.2);
            doc
                .fontSize(8)
                .font('Courier')
                .fillColor('#1F2937')
                .rect(doc.x - 5, doc.y - 5, 500, this.calculateSnippetHeight(violation.codeSnippet))
                .fillAndStroke('#F3F4F6', '#E5E7EB');
            doc
                .fillColor('#1F2937')
                .text(violation.codeSnippet, {
                width: 490,
                align: 'left',
            });
            doc.fillColor('black');
            doc.moveDown(1);
            // Separator
            if (index < violations.length - 1) {
                doc
                    .strokeColor('#E5E7EB')
                    .lineWidth(1)
                    .moveTo(50, doc.y)
                    .lineTo(545, doc.y)
                    .stroke();
                doc.moveDown(1);
            }
        });
        doc.addPage();
    }
    /**
     * Group violations by severity
     */
    groupBySeverity(violations) {
        return {
            mandatory: violations.filter((v) => v.severity === 'mandatory'),
            required: violations.filter((v) => v.severity === 'required'),
            advisory: violations.filter((v) => v.severity === 'advisory'),
        };
    }
    /**
     * Get color based on compliance percentage
     */
    getComplianceColor(compliance) {
        if (compliance >= 90)
            return '#10B981'; // Green
        if (compliance >= 70)
            return '#F59E0B'; // Orange
        return '#DC2626'; // Red
    }
    /**
     * Get assessment text based on compliance percentage
     */
    getAssessment(compliance) {
        if (compliance >= 95) {
            return 'Excellent! The code demonstrates high compliance with MISRA standards. Only minor issues remain.';
        }
        if (compliance >= 85) {
            return 'Good compliance level. The code follows most MISRA guidelines, but some improvements are recommended.';
        }
        if (compliance >= 70) {
            return 'Moderate compliance. Several violations need to be addressed to meet MISRA standards.';
        }
        if (compliance >= 50) {
            return 'Low compliance. Significant work is required to bring the code up to MISRA standards.';
        }
        return 'Critical compliance issues detected. Immediate attention is required to address multiple violations.';
    }
    /**
     * Calculate height needed for code snippet box
     */
    calculateSnippetHeight(snippet) {
        const lines = snippet.split('\n').length;
        return Math.max(lines * 12 + 10, 30);
    }
}
exports.ReportGenerator = ReportGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0LWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlcG9ydC1nZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7Ozs7QUFFSCxvREFBaUM7QUFTakMsTUFBYSxlQUFlO0lBQzFCOzs7T0FHRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQUMsY0FBOEIsRUFBRSxRQUFnQjtRQUNoRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQztnQkFDSCxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFXLENBQUM7b0JBQzFCLElBQUksRUFBRSxJQUFJO29CQUNWLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7aUJBQ3RELENBQUMsQ0FBQztnQkFFSCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7Z0JBRTVCLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRXhCLDBCQUEwQjtnQkFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyw0QkFBNEI7Z0JBQzNFLElB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QUMzQyxJQUFJLFVBQVUsSUFBSSxFQUFFO1lBQUUsT0FBTyxTQUFTLENBQUMsQ0FBQyxRQUFRO1FBQ2hELElBQUksVUFBVSxJQUFJLEVBQUU7WUFBRSxPQUFPLFNBQVMsQ0FBQyxDQUFDLFNBQVM7UUFDakQsT0FBTyxTQUFTLENBQUMsQ0FBQyxNQUFNO0lBQzFCLENBQUM7SUFFRDs7T0FFRztJQUNLLGFBQWEsQ0FBQyxVQUFrQjtRQUN0QyxJQUFJLFVBQVUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNyQixPQUFPLGtHQUFrRyxDQUFDO1FBQzVHLENBQUM7UUFDRCxJQUFJLFVBQVUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNyQixPQUFPLHVHQUF1RyxDQUFDO1FBQ2pILENBQUM7UUFDRCxJQUFJLFVBQVUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNyQixPQUFPLHVGQUF1RixDQUFDO1FBQ2pHLENBQUM7UUFDRCxJQUFJLFVBQVUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNyQixPQUFPLHVGQUF1RixDQUFDO1FBQ2pHLENBQUM7UUFDRCxPQUFPLHNHQUFzRyxDQUFDO0lBQ2hILENBQUM7SUFFRDs7T0FFRztJQUNLLHNCQUFzQixDQUFDLE9BQWU7UUFDNUMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDekMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRjtBQXJVRCwwQ0FxVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmVwb3J0IEdlbmVyYXRvciBmb3IgTUlTUkEgQW5hbHlzaXMgUmVzdWx0c1xyXG4gKiBHZW5lcmF0ZXMgUERGIHJlcG9ydHMgd2l0aCBleGVjdXRpdmUgc3VtbWFyeSBhbmQgZGV0YWlsZWQgdmlvbGF0aW9uc1xyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA4LjEsIDguMiwgOC4zLCA4LjQsIDguNVxyXG4gKi9cclxuXHJcbmltcG9ydCBQREZEb2N1bWVudCBmcm9tICdwZGZraXQnO1xyXG5pbXBvcnQgeyBBbmFseXNpc1Jlc3VsdCwgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuaW50ZXJmYWNlIFZpb2xhdGlvbnNCeVNldmVyaXR5IHtcclxuICBtYW5kYXRvcnk6IFZpb2xhdGlvbltdO1xyXG4gIHJlcXVpcmVkOiBWaW9sYXRpb25bXTtcclxuICBhZHZpc29yeTogVmlvbGF0aW9uW107XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSZXBvcnRHZW5lcmF0b3Ige1xyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIFBERiByZXBvcnQgZm9yIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgKiBSZXF1aXJlbWVudHM6IDguMSwgOC4yLCA4LjMsIDguNCwgOC41XHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGVQREYoYW5hbHlzaXNSZXN1bHQ6IEFuYWx5c2lzUmVzdWx0LCBmaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxCdWZmZXI+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgZG9jID0gbmV3IFBERkRvY3VtZW50KHtcclxuICAgICAgICAgIHNpemU6ICdBNCcsXHJcbiAgICAgICAgICBtYXJnaW5zOiB7IHRvcDogNTAsIGJvdHRvbTogNTAsIGxlZnQ6IDUwLCByaWdodDogNTAgfSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG5cclxuICAgICAgICBkb2Mub24oJ2RhdGEnLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgZG9jLm9uKCdlbmQnLCAoKSA9PiByZXNvbHZlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKSkpO1xyXG4gICAgICAgIGRvYy5vbignZXJyb3InLCByZWplY3QpO1xyXG5cclxuICAgICAgICAvLyBHZW5lcmF0ZSByZXBvcnQgY29udGVudFxyXG4gICAgICAgIHRoaXMuYWRkVGl0bGVQYWdlKGRvYywgZmlsZU5hbWUpO1xyXG4gICAgICAgIHRoaXMuYWRkRXhlY3V0aXZlU3VtbWFyeShkb2MsIGFuYWx5c2lzUmVzdWx0KTsgLy8gUmVxdWlyZW1lbnQgOC4xLCA4LjIsIDguM1xyXG4gICAgICAgIHRoaXMuYWRkRGV0YWlsZWRWaW9sYXRpb25zKGRvYywgYW5hbHlzaXNSZXN1bHQpOyAvLyBSZXF1aXJlbWVudCA4LjQsIDguNVxyXG5cclxuICAgICAgICBkb2MuZW5kKCk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgdGl0bGUgcGFnZSB0byB0aGUgcmVwb3J0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhZGRUaXRsZVBhZ2UoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGZpbGVOYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGRvY1xyXG4gICAgICAuZm9udFNpemUoMjgpXHJcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EtQm9sZCcpXHJcbiAgICAgIC50ZXh0KCdNSVNSQSBDb21wbGlhbmNlIFJlcG9ydCcsIHsgYWxpZ246ICdjZW50ZXInIH0pO1xyXG5cclxuICAgIGRvYy5tb3ZlRG93bigyKTtcclxuXHJcbiAgICBkb2NcclxuICAgICAgLmZvbnRTaXplKDE2KVxyXG4gICAgICAuZm9udCgnSGVsdmV0aWNhJylcclxuICAgICAgLnRleHQoYEZpbGU6ICR7ZmlsZU5hbWV9YCwgeyBhbGlnbjogJ2NlbnRlcicgfSk7XHJcblxyXG4gICAgZG9jLm1vdmVEb3duKDEpO1xyXG5cclxuICAgIGRvY1xyXG4gICAgICAuZm9udFNpemUoMTIpXHJcbiAgICAgIC50ZXh0KGBHZW5lcmF0ZWQ6ICR7bmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfWAsIHsgYWxpZ246ICdjZW50ZXInIH0pO1xyXG5cclxuICAgIGRvYy5tb3ZlRG93bigzKTtcclxuXHJcbiAgICBkb2NcclxuICAgICAgLmZvbnRTaXplKDEwKVxyXG4gICAgICAuZm9udCgnSGVsdmV0aWNhLU9ibGlxdWUnKVxyXG4gICAgICAudGV4dCgnTUlTUkEgUGxhdGZvcm0gLSBTdGF0aWMgQ29kZSBBbmFseXNpcycsIHsgYWxpZ246ICdjZW50ZXInIH0pO1xyXG5cclxuICAgIGRvYy5hZGRQYWdlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgZXhlY3V0aXZlIHN1bW1hcnkgc2VjdGlvblxyXG4gICAqIFJlcXVpcmVtZW50czogOC4xLCA4LjIsIDguM1xyXG4gICAqIC0gOC4xOiBJbmNsdWRlIGV4ZWN1dGl2ZSBzdW1tYXJ5IHNlY3Rpb25cclxuICAgKiAtIDguMjogU2hvdyBjb21wbGlhbmNlIHBlcmNlbnRhZ2VcclxuICAgKiAtIDguMzogU2hvdyBzZXZlcml0eSBicmVha2Rvd25cclxuICAgKi9cclxuICBwcml2YXRlIGFkZEV4ZWN1dGl2ZVN1bW1hcnkoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdCk6IHZvaWQge1xyXG4gICAgZG9jXHJcbiAgICAgIC5mb250U2l6ZSgyMClcclxuICAgICAgLmZvbnQoJ0hlbHZldGljYS1Cb2xkJylcclxuICAgICAgLnRleHQoJ0V4ZWN1dGl2ZSBTdW1tYXJ5JywgeyB1bmRlcmxpbmU6IHRydWUgfSk7XHJcblxyXG4gICAgZG9jLm1vdmVEb3duKDEpO1xyXG5cclxuICAgIC8vIENvbXBsaWFuY2UgcGVyY2VudGFnZSAoUmVxdWlyZW1lbnQgOC4yKVxyXG4gICAgY29uc3QgY29tcGxpYW5jZSA9IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2U7XHJcbiAgICBjb25zdCBjb21wbGlhbmNlQ29sb3IgPSB0aGlzLmdldENvbXBsaWFuY2VDb2xvcihjb21wbGlhbmNlKTtcclxuXHJcbiAgICBkb2NcclxuICAgICAgLmZvbnRTaXplKDE0KVxyXG4gICAgICAuZm9udCgnSGVsdmV0aWNhLUJvbGQnKVxyXG4gICAgICAuZmlsbENvbG9yKGNvbXBsaWFuY2VDb2xvcilcclxuICAgICAgLnRleHQoYENvbXBsaWFuY2U6ICR7Y29tcGxpYW5jZS50b0ZpeGVkKDIpfSVgKTtcclxuXHJcbiAgICBkb2MuZmlsbENvbG9yKCdibGFjaycpO1xyXG4gICAgZG9jLm1vdmVEb3duKDEpO1xyXG5cclxuICAgIC8vIFRvdGFsIHZpb2xhdGlvbnNcclxuICAgIGRvY1xyXG4gICAgICAuZm9udFNpemUoMTIpXHJcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EnKVxyXG4gICAgICAudGV4dChgVG90YWwgVmlvbGF0aW9uczogJHthbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LnRvdGFsVmlvbGF0aW9uc31gKTtcclxuXHJcbiAgICBkb2MubW92ZURvd24oMSk7XHJcblxyXG4gICAgLy8gU2V2ZXJpdHkgYnJlYWtkb3duIChSZXF1aXJlbWVudCA4LjMpXHJcbiAgICBkb2NcclxuICAgICAgLmZvbnRTaXplKDE0KVxyXG4gICAgICAuZm9udCgnSGVsdmV0aWNhLUJvbGQnKVxyXG4gICAgICAudGV4dCgnVmlvbGF0aW9ucyBieSBTZXZlcml0eTonKTtcclxuXHJcbiAgICBkb2MubW92ZURvd24oMC41KTtcclxuXHJcbiAgICBkb2NcclxuICAgICAgLmZvbnRTaXplKDEyKVxyXG4gICAgICAuZm9udCgnSGVsdmV0aWNhJylcclxuICAgICAgLmZpbGxDb2xvcignI0RDMjYyNicpXHJcbiAgICAgIC50ZXh0KGAgIOKAoiBNYW5kYXRvcnk6ICR7YW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jcml0aWNhbENvdW50fWAsIHsgY29udGludWVkOiBmYWxzZSB9KTtcclxuXHJcbiAgICBkb2NcclxuICAgICAgLmZpbGxDb2xvcignI0Y1OUUwQicpXHJcbiAgICAgIC50ZXh0KGAgIOKAoiBSZXF1aXJlZDogJHthbmFseXNpc1Jlc3VsdC5zdW1tYXJ5Lm1ham9yQ291bnR9YCwgeyBjb250aW51ZWQ6IGZhbHNlIH0pO1xyXG5cclxuICAgIGRvY1xyXG4gICAgICAuZmlsbENvbG9yKCcjM0I4MkY2JylcclxuICAgICAgLnRleHQoYCAg4oCiIEFkdmlzb3J5OiAke2FuYWx5c2lzUmVzdWx0LnN1bW1hcnkubWlub3JDb3VudH1gLCB7IGNvbnRpbnVlZDogZmFsc2UgfSk7XHJcblxyXG4gICAgZG9jLmZpbGxDb2xvcignYmxhY2snKTtcclxuICAgIGRvYy5tb3ZlRG93bigxKTtcclxuXHJcbiAgICAvLyBPdmVyYWxsIGFzc2Vzc21lbnRcclxuICAgIGRvY1xyXG4gICAgICAuZm9udFNpemUoMTQpXHJcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EtQm9sZCcpXHJcbiAgICAgIC50ZXh0KCdPdmVyYWxsIEFzc2Vzc21lbnQ6Jyk7XHJcblxyXG4gICAgZG9jLm1vdmVEb3duKDAuNSk7XHJcblxyXG4gICAgY29uc3QgYXNzZXNzbWVudCA9IHRoaXMuZ2V0QXNzZXNzbWVudChjb21wbGlhbmNlKTtcclxuICAgIGRvY1xyXG4gICAgICAuZm9udFNpemUoMTIpXHJcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EnKVxyXG4gICAgICAudGV4dChhc3Nlc3NtZW50LCB7IGFsaWduOiAnanVzdGlmeScgfSk7XHJcblxyXG4gICAgZG9jLmFkZFBhZ2UoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBkZXRhaWxlZCB2aW9sYXRpb25zIHNlY3Rpb25cclxuICAgKiBSZXF1aXJlbWVudHM6IDguNCwgOC41XHJcbiAgICogLSA4LjQ6IEdyb3VwIHZpb2xhdGlvbnMgYnkgc2V2ZXJpdHlcclxuICAgKiAtIDguNTogSW5jbHVkZSBjb2RlIHNuaXBwZXRzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhZGREZXRhaWxlZFZpb2xhdGlvbnMoZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsIGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdCk6IHZvaWQge1xyXG4gICAgZG9jXHJcbiAgICAgIC5mb250U2l6ZSgyMClcclxuICAgICAgLmZvbnQoJ0hlbHZldGljYS1Cb2xkJylcclxuICAgICAgLnRleHQoJ0RldGFpbGVkIFZpb2xhdGlvbnMnLCB7IHVuZGVybGluZTogdHJ1ZSB9KTtcclxuXHJcbiAgICBkb2MubW92ZURvd24oMSk7XHJcblxyXG4gICAgaWYgKGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGRvY1xyXG4gICAgICAgIC5mb250U2l6ZSgxMilcclxuICAgICAgICAuZm9udCgnSGVsdmV0aWNhJylcclxuICAgICAgICAudGV4dCgnTm8gdmlvbGF0aW9ucyBmb3VuZC4gQ29kZSBpcyBmdWxseSBjb21wbGlhbnQhJywgeyBhbGlnbjogJ2NlbnRlcicgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHcm91cCB2aW9sYXRpb25zIGJ5IHNldmVyaXR5IChSZXF1aXJlbWVudCA4LjQpXHJcbiAgICBjb25zdCBncm91cGVkID0gdGhpcy5ncm91cEJ5U2V2ZXJpdHkoYW5hbHlzaXNSZXN1bHQudmlvbGF0aW9ucyk7XHJcblxyXG4gICAgLy8gTWFuZGF0b3J5IHZpb2xhdGlvbnNcclxuICAgIGlmIChncm91cGVkLm1hbmRhdG9yeS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHRoaXMuYWRkVmlvbGF0aW9uU2VjdGlvbihkb2MsICdNYW5kYXRvcnkgVmlvbGF0aW9ucycsIGdyb3VwZWQubWFuZGF0b3J5LCAnI0RDMjYyNicpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlcXVpcmVkIHZpb2xhdGlvbnNcclxuICAgIGlmIChncm91cGVkLnJlcXVpcmVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgdGhpcy5hZGRWaW9sYXRpb25TZWN0aW9uKGRvYywgJ1JlcXVpcmVkIFZpb2xhdGlvbnMnLCBncm91cGVkLnJlcXVpcmVkLCAnI0Y1OUUwQicpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkdmlzb3J5IHZpb2xhdGlvbnNcclxuICAgIGlmIChncm91cGVkLmFkdmlzb3J5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgdGhpcy5hZGRWaW9sYXRpb25TZWN0aW9uKGRvYywgJ0Fkdmlzb3J5IFZpb2xhdGlvbnMnLCBncm91cGVkLmFkdmlzb3J5LCAnIzNCODJGNicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIGEgc2VjdGlvbiBmb3IgdmlvbGF0aW9ucyBvZiBhIHNwZWNpZmljIHNldmVyaXR5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhZGRWaW9sYXRpb25TZWN0aW9uKFxyXG4gICAgZG9jOiBQREZLaXQuUERGRG9jdW1lbnQsXHJcbiAgICB0aXRsZTogc3RyaW5nLFxyXG4gICAgdmlvbGF0aW9uczogVmlvbGF0aW9uW10sXHJcbiAgICBjb2xvcjogc3RyaW5nXHJcbiAgKTogdm9pZCB7XHJcbiAgICBkb2NcclxuICAgICAgLmZvbnRTaXplKDE2KVxyXG4gICAgICAuZm9udCgnSGVsdmV0aWNhLUJvbGQnKVxyXG4gICAgICAuZmlsbENvbG9yKGNvbG9yKVxyXG4gICAgICAudGV4dCh0aXRsZSk7XHJcblxyXG4gICAgZG9jLmZpbGxDb2xvcignYmxhY2snKTtcclxuICAgIGRvYy5tb3ZlRG93bigwLjUpO1xyXG5cclxuICAgIGRvY1xyXG4gICAgICAuZm9udFNpemUoMTApXHJcbiAgICAgIC5mb250KCdIZWx2ZXRpY2EnKVxyXG4gICAgICAudGV4dChgVG90YWw6ICR7dmlvbGF0aW9ucy5sZW5ndGh9IHZpb2xhdGlvbihzKWApO1xyXG5cclxuICAgIGRvYy5tb3ZlRG93bigxKTtcclxuXHJcbiAgICB2aW9sYXRpb25zLmZvckVhY2goKHZpb2xhdGlvbiwgaW5kZXgpID0+IHtcclxuICAgICAgLy8gQ2hlY2sgaWYgd2UgbmVlZCBhIG5ldyBwYWdlXHJcbiAgICAgIGlmIChkb2MueSA+IDY1MCkge1xyXG4gICAgICAgIGRvYy5hZGRQYWdlKCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZpb2xhdGlvbiBoZWFkZXJcclxuICAgICAgZG9jXHJcbiAgICAgICAgLmZvbnRTaXplKDEyKVxyXG4gICAgICAgIC5mb250KCdIZWx2ZXRpY2EtQm9sZCcpXHJcbiAgICAgICAgLnRleHQoYCR7aW5kZXggKyAxfS4gUnVsZSAke3Zpb2xhdGlvbi5ydWxlSWR9OiAke3Zpb2xhdGlvbi5ydWxlTmFtZX1gKTtcclxuXHJcbiAgICAgIGRvYy5tb3ZlRG93bigwLjMpO1xyXG5cclxuICAgICAgLy8gTG9jYXRpb25cclxuICAgICAgZG9jXHJcbiAgICAgICAgLmZvbnRTaXplKDEwKVxyXG4gICAgICAgIC5mb250KCdIZWx2ZXRpY2EnKVxyXG4gICAgICAgIC50ZXh0KGBMb2NhdGlvbjogTGluZSAke3Zpb2xhdGlvbi5saW5lfSwgQ29sdW1uICR7dmlvbGF0aW9uLmNvbHVtbn1gKTtcclxuXHJcbiAgICAgIGRvYy5tb3ZlRG93bigwLjMpO1xyXG5cclxuICAgICAgLy8gTWVzc2FnZVxyXG4gICAgICBkb2NcclxuICAgICAgICAuZm9udFNpemUoMTApXHJcbiAgICAgICAgLmZvbnQoJ0hlbHZldGljYScpXHJcbiAgICAgICAgLnRleHQoYE1lc3NhZ2U6ICR7dmlvbGF0aW9uLm1lc3NhZ2V9YCwgeyBhbGlnbjogJ2p1c3RpZnknIH0pO1xyXG5cclxuICAgICAgZG9jLm1vdmVEb3duKDAuNSk7XHJcblxyXG4gICAgICAvLyBDb2RlIHNuaXBwZXQgKFJlcXVpcmVtZW50IDguNSlcclxuICAgICAgZG9jXHJcbiAgICAgICAgLmZvbnRTaXplKDkpXHJcbiAgICAgICAgLmZvbnQoJ0NvdXJpZXInKVxyXG4gICAgICAgIC5maWxsQ29sb3IoJyMzNzQxNTEnKVxyXG4gICAgICAgIC50ZXh0KCdDb2RlIFNuaXBwZXQ6JywgeyBjb250aW51ZWQ6IGZhbHNlIH0pO1xyXG5cclxuICAgICAgZG9jLm1vdmVEb3duKDAuMik7XHJcblxyXG4gICAgICBkb2NcclxuICAgICAgICAuZm9udFNpemUoOClcclxuICAgICAgICAuZm9udCgnQ291cmllcicpXHJcbiAgICAgICAgLmZpbGxDb2xvcignIzFGMjkzNycpXHJcbiAgICAgICAgLnJlY3QoZG9jLnggLSA1LCBkb2MueSAtIDUsIDUwMCwgdGhpcy5jYWxjdWxhdGVTbmlwcGV0SGVpZ2h0KHZpb2xhdGlvbi5jb2RlU25pcHBldCkpXHJcbiAgICAgICAgLmZpbGxBbmRTdHJva2UoJyNGM0Y0RjYnLCAnI0U1RTdFQicpO1xyXG5cclxuICAgICAgZG9jXHJcbiAgICAgICAgLmZpbGxDb2xvcignIzFGMjkzNycpXHJcbiAgICAgICAgLnRleHQodmlvbGF0aW9uLmNvZGVTbmlwcGV0LCB7XHJcbiAgICAgICAgICB3aWR0aDogNDkwLFxyXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgIGRvYy5maWxsQ29sb3IoJ2JsYWNrJyk7XHJcbiAgICAgIGRvYy5tb3ZlRG93bigxKTtcclxuXHJcbiAgICAgIC8vIFNlcGFyYXRvclxyXG4gICAgICBpZiAoaW5kZXggPCB2aW9sYXRpb25zLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICBkb2NcclxuICAgICAgICAgIC5zdHJva2VDb2xvcignI0U1RTdFQicpXHJcbiAgICAgICAgICAubGluZVdpZHRoKDEpXHJcbiAgICAgICAgICAubW92ZVRvKDUwLCBkb2MueSlcclxuICAgICAgICAgIC5saW5lVG8oNTQ1LCBkb2MueSlcclxuICAgICAgICAgIC5zdHJva2UoKTtcclxuXHJcbiAgICAgICAgZG9jLm1vdmVEb3duKDEpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBkb2MuYWRkUGFnZSgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JvdXAgdmlvbGF0aW9ucyBieSBzZXZlcml0eVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ3JvdXBCeVNldmVyaXR5KHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdKTogVmlvbGF0aW9uc0J5U2V2ZXJpdHkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbWFuZGF0b3J5OiB2aW9sYXRpb25zLmZpbHRlcigodikgPT4gdi5zZXZlcml0eSA9PT0gJ21hbmRhdG9yeScpLFxyXG4gICAgICByZXF1aXJlZDogdmlvbGF0aW9ucy5maWx0ZXIoKHYpID0+IHYuc2V2ZXJpdHkgPT09ICdyZXF1aXJlZCcpLFxyXG4gICAgICBhZHZpc29yeTogdmlvbGF0aW9ucy5maWx0ZXIoKHYpID0+IHYuc2V2ZXJpdHkgPT09ICdhZHZpc29yeScpLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBjb2xvciBiYXNlZCBvbiBjb21wbGlhbmNlIHBlcmNlbnRhZ2VcclxuICAgKi9cclxuICBwcml2YXRlIGdldENvbXBsaWFuY2VDb2xvcihjb21wbGlhbmNlOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgaWYgKGNvbXBsaWFuY2UgPj0gOTApIHJldHVybiAnIzEwQjk4MSc7IC8vIEdyZWVuXHJcbiAgICBpZiAoY29tcGxpYW5jZSA+PSA3MCkgcmV0dXJuICcjRjU5RTBCJzsgLy8gT3JhbmdlXHJcbiAgICByZXR1cm4gJyNEQzI2MjYnOyAvLyBSZWRcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhc3Nlc3NtZW50IHRleHQgYmFzZWQgb24gY29tcGxpYW5jZSBwZXJjZW50YWdlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRBc3Nlc3NtZW50KGNvbXBsaWFuY2U6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBpZiAoY29tcGxpYW5jZSA+PSA5NSkge1xyXG4gICAgICByZXR1cm4gJ0V4Y2VsbGVudCEgVGhlIGNvZGUgZGVtb25zdHJhdGVzIGhpZ2ggY29tcGxpYW5jZSB3aXRoIE1JU1JBIHN0YW5kYXJkcy4gT25seSBtaW5vciBpc3N1ZXMgcmVtYWluLic7XHJcbiAgICB9XHJcbiAgICBpZiAoY29tcGxpYW5jZSA+PSA4NSkge1xyXG4gICAgICByZXR1cm4gJ0dvb2QgY29tcGxpYW5jZSBsZXZlbC4gVGhlIGNvZGUgZm9sbG93cyBtb3N0IE1JU1JBIGd1aWRlbGluZXMsIGJ1dCBzb21lIGltcHJvdmVtZW50cyBhcmUgcmVjb21tZW5kZWQuJztcclxuICAgIH1cclxuICAgIGlmIChjb21wbGlhbmNlID49IDcwKSB7XHJcbiAgICAgIHJldHVybiAnTW9kZXJhdGUgY29tcGxpYW5jZS4gU2V2ZXJhbCB2aW9sYXRpb25zIG5lZWQgdG8gYmUgYWRkcmVzc2VkIHRvIG1lZXQgTUlTUkEgc3RhbmRhcmRzLic7XHJcbiAgICB9XHJcbiAgICBpZiAoY29tcGxpYW5jZSA+PSA1MCkge1xyXG4gICAgICByZXR1cm4gJ0xvdyBjb21wbGlhbmNlLiBTaWduaWZpY2FudCB3b3JrIGlzIHJlcXVpcmVkIHRvIGJyaW5nIHRoZSBjb2RlIHVwIHRvIE1JU1JBIHN0YW5kYXJkcy4nO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdDcml0aWNhbCBjb21wbGlhbmNlIGlzc3VlcyBkZXRlY3RlZC4gSW1tZWRpYXRlIGF0dGVudGlvbiBpcyByZXF1aXJlZCB0byBhZGRyZXNzIG11bHRpcGxlIHZpb2xhdGlvbnMuJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBoZWlnaHQgbmVlZGVkIGZvciBjb2RlIHNuaXBwZXQgYm94XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVTbmlwcGV0SGVpZ2h0KHNuaXBwZXQ6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBsaW5lcyA9IHNuaXBwZXQuc3BsaXQoJ1xcbicpLmxlbmd0aDtcclxuICAgIHJldHVybiBNYXRoLm1heChsaW5lcyAqIDEyICsgMTAsIDMwKTtcclxuICB9XHJcbn1cclxuIl19