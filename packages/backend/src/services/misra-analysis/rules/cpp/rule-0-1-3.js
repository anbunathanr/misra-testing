"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-3
 * A project shall not contain unused local variables.
 * Detects local variables that are declared but never read.
 */
class Rule_CPP_0_1_3 {
    id = 'MISRA-CPP-0.1.3';
    description = 'A project shall not contain unused local variables';
    severity = 'required';
    category = 'Unused code';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect local variable declarations inside function bodies (indented lines)
        const localVarRegex = /^\s{2,}(?:(?:const|static|volatile|auto)\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*(?:=.*?)?;\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//') || line.trim().startsWith('#') || !line.trim())
                continue;
            const match = line.match(localVarRegex);
            if (!match)
                continue;
            const varName = match[1];
            const skipNames = ['return', 'break', 'continue', 'else', 'public', 'private', 'protected'];
            if (skipNames.includes(varName))
                continue;
            // Check if varName is used anywhere after declaration
            const restOfCode = lines.slice(i + 1).join('\n');
            const usageRegex = new RegExp(`\\b${varName}\\b`);
            if (!usageRegex.test(restOfCode)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Local variable '${varName}' is declared but never used`, line.trim()));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_3 = Rule_CPP_0_1_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxvREFBb0QsQ0FBQztJQUNuRSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDZFQUE2RTtRQUM3RSxNQUFNLGFBQWEsR0FBRyxpSEFBaUgsQ0FBQztRQUV4SSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQUUsU0FBUztZQUUxRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxLQUFLO2dCQUFFLFNBQVM7WUFFckIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sU0FBUyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDNUYsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFBRSxTQUFTO1lBRTFDLHNEQUFzRDtZQUN0RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakQsTUFBTSxVQUFVLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxPQUFPLEtBQUssQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxtQkFBbUIsT0FBTyw4QkFBOEIsRUFDeEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBM0NELHdDQTJDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDAtMS0zXHJcbiAqIEEgcHJvamVjdCBzaGFsbCBub3QgY29udGFpbiB1bnVzZWQgbG9jYWwgdmFyaWFibGVzLlxyXG4gKiBEZXRlY3RzIGxvY2FsIHZhcmlhYmxlcyB0aGF0IGFyZSBkZWNsYXJlZCBidXQgbmV2ZXIgcmVhZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8wXzFfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTAuMS4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIHByb2plY3Qgc2hhbGwgbm90IGNvbnRhaW4gdW51c2VkIGxvY2FsIHZhcmlhYmxlcyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1VudXNlZCBjb2RlJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIERldGVjdCBsb2NhbCB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaW5zaWRlIGZ1bmN0aW9uIGJvZGllcyAoaW5kZW50ZWQgbGluZXMpXHJcbiAgICBjb25zdCBsb2NhbFZhclJlZ2V4ID0gL15cXHN7Mix9KD86KD86Y29uc3R8c3RhdGljfHZvbGF0aWxlfGF1dG8pXFxzKykqKD86W2EtekEtWl9dW1xcdzpdKig/OlxccypbKiZdKyk/KVxccysoW2EtekEtWl9dXFx3KilcXHMqKD86PS4qPyk/O1xccyokLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS50cmltKCkuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lLnRyaW0oKSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2gobG9jYWxWYXJSZWdleCk7XHJcbiAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgdmFyTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICBjb25zdCBza2lwTmFtZXMgPSBbJ3JldHVybicsICdicmVhaycsICdjb250aW51ZScsICdlbHNlJywgJ3B1YmxpYycsICdwcml2YXRlJywgJ3Byb3RlY3RlZCddO1xyXG4gICAgICBpZiAoc2tpcE5hbWVzLmluY2x1ZGVzKHZhck5hbWUpKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHZhck5hbWUgaXMgdXNlZCBhbnl3aGVyZSBhZnRlciBkZWNsYXJhdGlvblxyXG4gICAgICBjb25zdCByZXN0T2ZDb2RlID0gbGluZXMuc2xpY2UoaSArIDEpLmpvaW4oJ1xcbicpO1xyXG4gICAgICBjb25zdCB1c2FnZVJlZ2V4ID0gbmV3IFJlZ0V4cChgXFxcXGIke3Zhck5hbWV9XFxcXGJgKTtcclxuICAgICAgaWYgKCF1c2FnZVJlZ2V4LnRlc3QocmVzdE9mQ29kZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBgTG9jYWwgdmFyaWFibGUgJyR7dmFyTmFtZX0nIGlzIGRlY2xhcmVkIGJ1dCBuZXZlciB1c2VkYCxcclxuICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==