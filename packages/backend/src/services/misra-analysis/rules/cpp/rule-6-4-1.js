"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_4_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 6-4-1
 * An if (condition) construct shall be followed by a compound statement.
 * The else keyword shall be followed by either a compound statement, or another if statement.
 * Also checks: A switch statement shall have at least two case clauses.
 */
class Rule_CPP_6_4_1 {
    id = 'MISRA-CPP-6.4.1';
    description = 'A switch statement shall have at least two case clauses';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Find switch statements and count their case clauses
        let inSwitch = false;
        let switchStartLine = -1;
        let caseCount = 0;
        let braceDepth = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || !line)
                continue;
            // Detect switch statement start
            if (line.includes('switch') && line.includes('(')) {
                inSwitch = true;
                switchStartLine = i;
                caseCount = 0;
                braceDepth = 0;
            }
            if (inSwitch) {
                // Count braces to track switch scope
                braceDepth += (line.match(/{/g) || []).length;
                braceDepth -= (line.match(/}/g) || []).length;
                // Count case statements
                if (line.match(/^\s*case\s+/)) {
                    caseCount++;
                }
                // Check if switch ends
                if (braceDepth === 0 && line.includes('}')) {
                    if (caseCount < 2) {
                        violations.push((0, rule_engine_1.createViolation)(this, switchStartLine + 1, 0, `Switch statement has only ${caseCount} case clause(s); at least 2 required`, lines[switchStartLine].trim()));
                    }
                    inSwitch = false;
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_6_4_1 = Rule_CPP_6_4_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTQtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi00LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7OztHQUtHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQztJQUN2QixXQUFXLEdBQUcseURBQXlELENBQUM7SUFDeEUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixzREFBc0Q7UUFDdEQsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFFbkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRTdDLGdDQUFnQztZQUNoQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixlQUFlLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixTQUFTLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztZQUVELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2IscUNBQXFDO2dCQUNyQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDOUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBRTlDLHdCQUF3QjtnQkFDeEIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7b0JBQzlCLFNBQVMsRUFBRSxDQUFDO2dCQUNkLENBQUM7Z0JBRUQsdUJBQXVCO2dCQUN2QixJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMzQyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDbEIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLGVBQWUsR0FBRyxDQUFDLEVBQ25CLENBQUMsRUFDRCw2QkFBNkIsU0FBUyxzQ0FBc0MsRUFDNUUsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUM5QixDQUNGLENBQUM7b0JBQ0osQ0FBQztvQkFDRCxRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUNuQixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEzREQsd0NBMkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNi00LTFcclxuICogQW4gaWYgKGNvbmRpdGlvbikgY29uc3RydWN0IHNoYWxsIGJlIGZvbGxvd2VkIGJ5IGEgY29tcG91bmQgc3RhdGVtZW50LlxyXG4gKiBUaGUgZWxzZSBrZXl3b3JkIHNoYWxsIGJlIGZvbGxvd2VkIGJ5IGVpdGhlciBhIGNvbXBvdW5kIHN0YXRlbWVudCwgb3IgYW5vdGhlciBpZiBzdGF0ZW1lbnQuXHJcbiAqIEFsc28gY2hlY2tzOiBBIHN3aXRjaCBzdGF0ZW1lbnQgc2hhbGwgaGF2ZSBhdCBsZWFzdCB0d28gY2FzZSBjbGF1c2VzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzZfNF8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNi40LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0Egc3dpdGNoIHN0YXRlbWVudCBzaGFsbCBoYXZlIGF0IGxlYXN0IHR3byBjYXNlIGNsYXVzZXMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRmluZCBzd2l0Y2ggc3RhdGVtZW50cyBhbmQgY291bnQgdGhlaXIgY2FzZSBjbGF1c2VzXHJcbiAgICBsZXQgaW5Td2l0Y2ggPSBmYWxzZTtcclxuICAgIGxldCBzd2l0Y2hTdGFydExpbmUgPSAtMTtcclxuICAgIGxldCBjYXNlQ291bnQgPSAwO1xyXG4gICAgbGV0IGJyYWNlRGVwdGggPSAwO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBEZXRlY3Qgc3dpdGNoIHN0YXRlbWVudCBzdGFydFxyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnc3dpdGNoJykgJiYgbGluZS5pbmNsdWRlcygnKCcpKSB7XHJcbiAgICAgICAgaW5Td2l0Y2ggPSB0cnVlO1xyXG4gICAgICAgIHN3aXRjaFN0YXJ0TGluZSA9IGk7XHJcbiAgICAgICAgY2FzZUNvdW50ID0gMDtcclxuICAgICAgICBicmFjZURlcHRoID0gMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGluU3dpdGNoKSB7XHJcbiAgICAgICAgLy8gQ291bnQgYnJhY2VzIHRvIHRyYWNrIHN3aXRjaCBzY29wZVxyXG4gICAgICAgIGJyYWNlRGVwdGggKz0gKGxpbmUubWF0Y2goL3svZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgICBicmFjZURlcHRoIC09IChsaW5lLm1hdGNoKC99L2cpIHx8IFtdKS5sZW5ndGg7XHJcblxyXG4gICAgICAgIC8vIENvdW50IGNhc2Ugc3RhdGVtZW50c1xyXG4gICAgICAgIGlmIChsaW5lLm1hdGNoKC9eXFxzKmNhc2VcXHMrLykpIHtcclxuICAgICAgICAgIGNhc2VDb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgc3dpdGNoIGVuZHNcclxuICAgICAgICBpZiAoYnJhY2VEZXB0aCA9PT0gMCAmJiBsaW5lLmluY2x1ZGVzKCd9JykpIHtcclxuICAgICAgICAgIGlmIChjYXNlQ291bnQgPCAyKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgc3dpdGNoU3RhcnRMaW5lICsgMSxcclxuICAgICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICBgU3dpdGNoIHN0YXRlbWVudCBoYXMgb25seSAke2Nhc2VDb3VudH0gY2FzZSBjbGF1c2Uocyk7IGF0IGxlYXN0IDIgcmVxdWlyZWRgLFxyXG4gICAgICAgICAgICAgICAgbGluZXNbc3dpdGNoU3RhcnRMaW5lXS50cmltKClcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpblN3aXRjaCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=