"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_2_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-2-6
 * A cast shall not convert a pointer to a function to any other pointer type,
 * including a pointer to function type.
 * Detects C-style casts (type) expression.
 */
class Rule_CPP_5_2_6 {
    id = 'MISRA-CPP-5.2.6';
    description = 'C-style casts shall not be used';
    severity = 'required';
    category = 'Expressions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect C-style casts: (type)expression
        // Look for patterns like (int), (float*), (MyClass&), etc.
        const cStyleCastRegex = /\(\s*(?:const\s+|volatile\s+|static\s+)*[a-zA-Z_][\w:]*\s*[*&]*\s*\)\s*[a-zA-Z_0-9]/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Skip function declarations/definitions (they have parentheses but aren't casts)
            if (line.includes('(') && (line.includes('{') || line.includes(';') && line.match(/^\s*\w+\s+\w+\s*\(/))) {
                continue;
            }
            if (cStyleCastRegex.test(line)) {
                // Exclude false positives: function calls, sizeof, etc.
                if (!line.includes('sizeof') && !line.match(/\b(if|while|for|switch)\s*\(/)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'C-style cast detected; use static_cast, dynamic_cast, const_cast, or reinterpret_cast instead', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_2_6 = Rule_CPP_5_2_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTItNi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0yLTYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7OztHQUtHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQztJQUN2QixXQUFXLEdBQUcsaUNBQWlDLENBQUM7SUFDaEQsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4Qix5Q0FBeUM7UUFDekMsMkRBQTJEO1FBQzNELE1BQU0sZUFBZSxHQUFHLHFGQUFxRixDQUFDO1FBRTlHLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLGtGQUFrRjtZQUNsRixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekcsU0FBUztZQUNYLENBQUM7WUFFRCxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0Isd0RBQXdEO2dCQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDO29CQUM1RSxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsK0ZBQStGLEVBQy9GLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBMUNELHdDQTBDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDUtMi02XHJcbiAqIEEgY2FzdCBzaGFsbCBub3QgY29udmVydCBhIHBvaW50ZXIgdG8gYSBmdW5jdGlvbiB0byBhbnkgb3RoZXIgcG9pbnRlciB0eXBlLFxyXG4gKiBpbmNsdWRpbmcgYSBwb2ludGVyIHRvIGZ1bmN0aW9uIHR5cGUuXHJcbiAqIERldGVjdHMgQy1zdHlsZSBjYXN0cyAodHlwZSkgZXhwcmVzc2lvbi5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF81XzJfNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTUuMi42JztcclxuICBkZXNjcmlwdGlvbiA9ICdDLXN0eWxlIGNhc3RzIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRXhwcmVzc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0IEMtc3R5bGUgY2FzdHM6ICh0eXBlKWV4cHJlc3Npb25cclxuICAgIC8vIExvb2sgZm9yIHBhdHRlcm5zIGxpa2UgKGludCksIChmbG9hdCopLCAoTXlDbGFzcyYpLCBldGMuXHJcbiAgICBjb25zdCBjU3R5bGVDYXN0UmVnZXggPSAvXFwoXFxzKig/OmNvbnN0XFxzK3x2b2xhdGlsZVxccyt8c3RhdGljXFxzKykqW2EtekEtWl9dW1xcdzpdKlxccypbKiZdKlxccypcXClcXHMqW2EtekEtWl8wLTldLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gU2tpcCBmdW5jdGlvbiBkZWNsYXJhdGlvbnMvZGVmaW5pdGlvbnMgKHRoZXkgaGF2ZSBwYXJlbnRoZXNlcyBidXQgYXJlbid0IGNhc3RzKVxyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnKCcpICYmIChsaW5lLmluY2x1ZGVzKCd7JykgfHwgbGluZS5pbmNsdWRlcygnOycpICYmIGxpbmUubWF0Y2goL15cXHMqXFx3K1xccytcXHcrXFxzKlxcKC8pKSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoY1N0eWxlQ2FzdFJlZ2V4LnRlc3QobGluZSkpIHtcclxuICAgICAgICAvLyBFeGNsdWRlIGZhbHNlIHBvc2l0aXZlczogZnVuY3Rpb24gY2FsbHMsIHNpemVvZiwgZXRjLlxyXG4gICAgICAgIGlmICghbGluZS5pbmNsdWRlcygnc2l6ZW9mJykgJiYgIWxpbmUubWF0Y2goL1xcYihpZnx3aGlsZXxmb3J8c3dpdGNoKVxccypcXCgvKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdDLXN0eWxlIGNhc3QgZGV0ZWN0ZWQ7IHVzZSBzdGF0aWNfY2FzdCwgZHluYW1pY19jYXN0LCBjb25zdF9jYXN0LCBvciByZWludGVycHJldF9jYXN0IGluc3RlYWQnLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19