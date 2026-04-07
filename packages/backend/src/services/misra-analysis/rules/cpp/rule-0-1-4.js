"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-4
 * A project shall not contain non-volatile POD variables having only one use.
 * Detects variables that are assigned once but never read.
 */
class Rule_CPP_0_1_4 {
    id = 'MISRA-CPP-0.1.4';
    description = 'A project shall not contain non-volatile POD variables having only one use';
    severity = 'required';
    category = 'Unused code';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Find variable declarations with initialization
        const varDeclRegex = /^\s*(?:(?:const|static|mutable|auto|register)\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*=\s*.*;\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line || line.includes('volatile'))
                continue;
            const match = line.match(varDeclRegex);
            if (!match)
                continue;
            const varName = match[1];
            // Check if varName is used (read) in any subsequent line
            const restOfCode = lines.slice(i + 1).join('\n');
            const usageRegex = new RegExp(`\\b${varName}\\b`);
            // Count occurrences - if only in assignment (=), it's write-only
            const matches = restOfCode.match(new RegExp(`\\b${varName}\\b`, 'g'));
            if (!matches || matches.length === 0) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Variable '${varName}' is assigned but never read`, line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_4 = Rule_CPP_0_1_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtNC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw0RUFBNEUsQ0FBQztJQUMzRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGlEQUFpRDtRQUNqRCxNQUFNLFlBQVksR0FBRyxtSEFBbUgsQ0FBQztRQUV6SSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztnQkFBRSxTQUFTO1lBRWxHLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUVyQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFekIseURBQXlEO1lBQ3pELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRCxNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLE9BQU8sS0FBSyxDQUFDLENBQUM7WUFFbEQsaUVBQWlFO1lBQ2pFLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxPQUFPLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGFBQWEsT0FBTyw4QkFBOEIsRUFDbEQsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBNUNELHdDQTRDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDAtMS00XHJcbiAqIEEgcHJvamVjdCBzaGFsbCBub3QgY29udGFpbiBub24tdm9sYXRpbGUgUE9EIHZhcmlhYmxlcyBoYXZpbmcgb25seSBvbmUgdXNlLlxyXG4gKiBEZXRlY3RzIHZhcmlhYmxlcyB0aGF0IGFyZSBhc3NpZ25lZCBvbmNlIGJ1dCBuZXZlciByZWFkLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzBfMV80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMC4xLjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgcHJvamVjdCBzaGFsbCBub3QgY29udGFpbiBub24tdm9sYXRpbGUgUE9EIHZhcmlhYmxlcyBoYXZpbmcgb25seSBvbmUgdXNlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnVW51c2VkIGNvZGUnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRmluZCB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgd2l0aCBpbml0aWFsaXphdGlvblxyXG4gICAgY29uc3QgdmFyRGVjbFJlZ2V4ID0gL15cXHMqKD86KD86Y29uc3R8c3RhdGljfG11dGFibGV8YXV0b3xyZWdpc3RlcilcXHMrKSooPzpbYS16QS1aX11bXFx3Ol0qKD86XFxzKlsqJl0rKT8pXFxzKyhbYS16QS1aX11cXHcqKVxccyo9XFxzKi4qO1xccyokLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUgfHwgbGluZS5pbmNsdWRlcygndm9sYXRpbGUnKSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2godmFyRGVjbFJlZ2V4KTtcclxuICAgICAgaWYgKCFtYXRjaCkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCB2YXJOYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBpZiB2YXJOYW1lIGlzIHVzZWQgKHJlYWQpIGluIGFueSBzdWJzZXF1ZW50IGxpbmVcclxuICAgICAgY29uc3QgcmVzdE9mQ29kZSA9IGxpbmVzLnNsaWNlKGkgKyAxKS5qb2luKCdcXG4nKTtcclxuICAgICAgY29uc3QgdXNhZ2VSZWdleCA9IG5ldyBSZWdFeHAoYFxcXFxiJHt2YXJOYW1lfVxcXFxiYCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDb3VudCBvY2N1cnJlbmNlcyAtIGlmIG9ubHkgaW4gYXNzaWdubWVudCAoPSksIGl0J3Mgd3JpdGUtb25seVxyXG4gICAgICBjb25zdCBtYXRjaGVzID0gcmVzdE9mQ29kZS5tYXRjaChuZXcgUmVnRXhwKGBcXFxcYiR7dmFyTmFtZX1cXFxcYmAsICdnJykpO1xyXG4gICAgICBpZiAoIW1hdGNoZXMgfHwgbWF0Y2hlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBgVmFyaWFibGUgJyR7dmFyTmFtZX0nIGlzIGFzc2lnbmVkIGJ1dCBuZXZlciByZWFkYCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19