"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_12_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 12.4
 * Evaluation of constant expressions should not lead to unsigned integer wrap-around.
 */
class Rule_C_12_4 {
    id = 'MISRA-C-12.4';
    description = 'Evaluation of constant expressions should not lead to unsigned integer wrap-around';
    severity = 'advisory';
    category = 'Expressions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for unsigned arithmetic that might wrap
            const unsignedMatch = line.match(/unsigned\s+\w+\s+\w+\s*=\s*(.+);/);
            if (unsignedMatch) {
                const expr = unsignedMatch[1];
                // Check for large constant additions/multiplications
                const largeConstMatch = expr.match(/(\d+)\s*[\+\*]\s*(\d+)/);
                if (largeConstMatch) {
                    const val1 = parseInt(largeConstMatch[1]);
                    const val2 = parseInt(largeConstMatch[2]);
                    // Check if result might exceed UINT_MAX (simplified check)
                    if (val1 > 1000000 || val2 > 1000000) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Constant expression may lead to unsigned integer wrap-around', line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_12_4 = Rule_C_12_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMi00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMi00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0ZBQW9GLENBQUM7SUFDbkcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxnREFBZ0Q7WUFDaEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1lBQ3JFLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFOUIscURBQXFEO2dCQUNyRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7Z0JBQzdELElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3BCLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDMUMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUUxQywyREFBMkQ7b0JBQzNELElBQUksSUFBSSxHQUFHLE9BQU8sSUFBSSxJQUFJLEdBQUcsT0FBTyxFQUFFLENBQUM7d0JBQ3JDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCw4REFBOEQsRUFDOUQsSUFBSSxDQUNMLENBQ0YsQ0FBQztvQkFDSixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTFDRCxrQ0EwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTIuNFxyXG4gKiBFdmFsdWF0aW9uIG9mIGNvbnN0YW50IGV4cHJlc3Npb25zIHNob3VsZCBub3QgbGVhZCB0byB1bnNpZ25lZCBpbnRlZ2VyIHdyYXAtYXJvdW5kLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMl80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTEyLjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0V2YWx1YXRpb24gb2YgY29uc3RhbnQgZXhwcmVzc2lvbnMgc2hvdWxkIG5vdCBsZWFkIHRvIHVuc2lnbmVkIGludGVnZXIgd3JhcC1hcm91bmQnO1xyXG4gIHNldmVyaXR5ID0gJ2Fkdmlzb3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdFeHByZXNzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHVuc2lnbmVkIGFyaXRobWV0aWMgdGhhdCBtaWdodCB3cmFwXHJcbiAgICAgIGNvbnN0IHVuc2lnbmVkTWF0Y2ggPSBsaW5lLm1hdGNoKC91bnNpZ25lZFxccytcXHcrXFxzK1xcdytcXHMqPVxccyooLispOy8pO1xyXG4gICAgICBpZiAodW5zaWduZWRNYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IGV4cHIgPSB1bnNpZ25lZE1hdGNoWzFdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBsYXJnZSBjb25zdGFudCBhZGRpdGlvbnMvbXVsdGlwbGljYXRpb25zXHJcbiAgICAgICAgY29uc3QgbGFyZ2VDb25zdE1hdGNoID0gZXhwci5tYXRjaCgvKFxcZCspXFxzKltcXCtcXCpdXFxzKihcXGQrKS8pO1xyXG4gICAgICAgIGlmIChsYXJnZUNvbnN0TWF0Y2gpIHtcclxuICAgICAgICAgIGNvbnN0IHZhbDEgPSBwYXJzZUludChsYXJnZUNvbnN0TWF0Y2hbMV0pO1xyXG4gICAgICAgICAgY29uc3QgdmFsMiA9IHBhcnNlSW50KGxhcmdlQ29uc3RNYXRjaFsyXSk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIENoZWNrIGlmIHJlc3VsdCBtaWdodCBleGNlZWQgVUlOVF9NQVggKHNpbXBsaWZpZWQgY2hlY2spXHJcbiAgICAgICAgICBpZiAodmFsMSA+IDEwMDAwMDAgfHwgdmFsMiA+IDEwMDAwMDApIHtcclxuICAgICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAnQ29uc3RhbnQgZXhwcmVzc2lvbiBtYXkgbGVhZCB0byB1bnNpZ25lZCBpbnRlZ2VyIHdyYXAtYXJvdW5kJyxcclxuICAgICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==