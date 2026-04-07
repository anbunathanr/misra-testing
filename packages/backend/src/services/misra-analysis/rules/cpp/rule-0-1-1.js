"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-1
 * A project shall not contain unreachable code.
 * Detects unused variables (declared but never referenced after declaration).
 */
class Rule_CPP_0_1_1 {
    id = 'MISRA-CPP-0.1.1';
    description = 'A project shall not contain unused variables';
    severity = 'required';
    category = 'Unused code';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Find variable declarations and check if they are referenced later
        const varDeclRegex = /^\s*(?:(?:const|static|volatile|mutable|auto|register)\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*(?:=.*?)?;\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            const match = line.match(varDeclRegex);
            if (!match)
                continue;
            const varName = match[1];
            // Skip common keywords that look like variable names
            const skipNames = ['return', 'break', 'continue', 'else', 'public', 'private', 'protected'];
            if (skipNames.includes(varName))
                continue;
            // Check if varName is referenced in any subsequent line
            const restOfCode = lines.slice(i + 1).join('\n');
            const usageRegex = new RegExp(`\\b${varName}\\b`);
            if (!usageRegex.test(restOfCode)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Variable '${varName}' is declared but never used`, line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_1 = Rule_CPP_0_1_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw4Q0FBOEMsQ0FBQztJQUM3RCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLG9FQUFvRTtRQUNwRSxNQUFNLFlBQVksR0FBRywrSEFBK0gsQ0FBQztRQUVySixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLO2dCQUFFLFNBQVM7WUFFckIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLHFEQUFxRDtZQUNyRCxNQUFNLFNBQVMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzVGLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7Z0JBQUUsU0FBUztZQUUxQyx3REFBd0Q7WUFDeEQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pELE1BQU0sVUFBVSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sT0FBTyxLQUFLLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsYUFBYSxPQUFPLDhCQUE4QixFQUNsRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1Q0Qsd0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMC0xLTFcclxuICogQSBwcm9qZWN0IHNoYWxsIG5vdCBjb250YWluIHVucmVhY2hhYmxlIGNvZGUuXHJcbiAqIERldGVjdHMgdW51c2VkIHZhcmlhYmxlcyAoZGVjbGFyZWQgYnV0IG5ldmVyIHJlZmVyZW5jZWQgYWZ0ZXIgZGVjbGFyYXRpb24pLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzBfMV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMC4xLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgcHJvamVjdCBzaGFsbCBub3QgY29udGFpbiB1bnVzZWQgdmFyaWFibGVzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnVW51c2VkIGNvZGUnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRmluZCB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgYW5kIGNoZWNrIGlmIHRoZXkgYXJlIHJlZmVyZW5jZWQgbGF0ZXJcclxuICAgIGNvbnN0IHZhckRlY2xSZWdleCA9IC9eXFxzKig/Oig/OmNvbnN0fHN0YXRpY3x2b2xhdGlsZXxtdXRhYmxlfGF1dG98cmVnaXN0ZXIpXFxzKykqKD86W2EtekEtWl9dW1xcdzpdKig/OlxccypbKiZdKyk/KVxccysoW2EtekEtWl9dXFx3KilcXHMqKD86PS4qPyk/O1xccyokLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKHZhckRlY2xSZWdleCk7XHJcbiAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgdmFyTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICAvLyBTa2lwIGNvbW1vbiBrZXl3b3JkcyB0aGF0IGxvb2sgbGlrZSB2YXJpYWJsZSBuYW1lc1xyXG4gICAgICBjb25zdCBza2lwTmFtZXMgPSBbJ3JldHVybicsICdicmVhaycsICdjb250aW51ZScsICdlbHNlJywgJ3B1YmxpYycsICdwcml2YXRlJywgJ3Byb3RlY3RlZCddO1xyXG4gICAgICBpZiAoc2tpcE5hbWVzLmluY2x1ZGVzKHZhck5hbWUpKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHZhck5hbWUgaXMgcmVmZXJlbmNlZCBpbiBhbnkgc3Vic2VxdWVudCBsaW5lXHJcbiAgICAgIGNvbnN0IHJlc3RPZkNvZGUgPSBsaW5lcy5zbGljZShpICsgMSkuam9pbignXFxuJyk7XHJcbiAgICAgIGNvbnN0IHVzYWdlUmVnZXggPSBuZXcgUmVnRXhwKGBcXFxcYiR7dmFyTmFtZX1cXFxcYmApO1xyXG4gICAgICBpZiAoIXVzYWdlUmVnZXgudGVzdChyZXN0T2ZDb2RlKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIGBWYXJpYWJsZSAnJHt2YXJOYW1lfScgaXMgZGVjbGFyZWQgYnV0IG5ldmVyIHVzZWRgLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=