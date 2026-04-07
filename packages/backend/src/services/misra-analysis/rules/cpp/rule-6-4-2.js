"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_4_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 6-4-2
 * All if...else if constructs shall be terminated with an else clause.
 */
class Rule_CPP_6_4_2 {
    id = 'MISRA-CPP-6.4.2';
    description = 'All if...else if constructs shall be terminated with an else clause';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track if we're in an if-else if chain
        let inElseIfChain = false;
        let elseIfLine = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Start tracking when we see else if
            if (line.startsWith('else if') || line.includes('} else if')) {
                inElseIfChain = true;
                elseIfLine = i;
            }
            // Found a final else - chain is properly terminated
            else if (inElseIfChain && (line.startsWith('else {') || line === 'else' || line.includes('} else {'))) {
                inElseIfChain = false;
            }
            // Found something else that ends the chain without else
            else if (inElseIfChain && line.startsWith('}') && !line.includes('else')) {
                // Check if the next non-empty line is else
                let foundElse = false;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (!nextLine)
                        continue;
                    if (nextLine.startsWith('else') && !nextLine.startsWith('else if')) {
                        foundElse = true;
                    }
                    break;
                }
                if (!foundElse) {
                    violations.push((0, rule_engine_1.createViolation)(this, elseIfLine + 1, 0, 'if...else if construct must be terminated with an else clause', lines[elseIfLine]));
                }
                inElseIfChain = false;
            }
        }
        return violations;
    }
}
exports.Rule_CPP_6_4_2 = Rule_CPP_6_4_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTQtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi00LTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLHFFQUFxRSxDQUFDO0lBQ3BGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsd0NBQXdDO1FBQ3hDLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixxQ0FBcUM7WUFDckMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDN0QsYUFBYSxHQUFHLElBQUksQ0FBQztnQkFDckIsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNqQixDQUFDO1lBQ0Qsb0RBQW9EO2lCQUMvQyxJQUFJLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdEcsYUFBYSxHQUFHLEtBQUssQ0FBQztZQUN4QixDQUFDO1lBQ0Qsd0RBQXdEO2lCQUNuRCxJQUFJLGFBQWEsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN6RSwyQ0FBMkM7Z0JBQzNDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzFDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDakMsSUFBSSxDQUFDLFFBQVE7d0JBQUUsU0FBUztvQkFDeEIsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO3dCQUNuRSxTQUFTLEdBQUcsSUFBSSxDQUFDO29CQUNuQixDQUFDO29CQUNELE1BQU07Z0JBQ1IsQ0FBQztnQkFFRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2YsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLFVBQVUsR0FBRyxDQUFDLEVBQ2QsQ0FBQyxFQUNELCtEQUErRCxFQUMvRCxLQUFLLENBQUMsVUFBVSxDQUFDLENBQ2xCLENBQ0YsQ0FBQztnQkFDSixDQUFDO2dCQUNELGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDeEIsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF6REQsd0NBeURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNi00LTJcclxuICogQWxsIGlmLi4uZWxzZSBpZiBjb25zdHJ1Y3RzIHNoYWxsIGJlIHRlcm1pbmF0ZWQgd2l0aCBhbiBlbHNlIGNsYXVzZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF82XzRfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTYuNC4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdBbGwgaWYuLi5lbHNlIGlmIGNvbnN0cnVjdHMgc2hhbGwgYmUgdGVybWluYXRlZCB3aXRoIGFuIGVsc2UgY2xhdXNlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIGlmIHdlJ3JlIGluIGFuIGlmLWVsc2UgaWYgY2hhaW5cclxuICAgIGxldCBpbkVsc2VJZkNoYWluID0gZmFsc2U7XHJcbiAgICBsZXQgZWxzZUlmTGluZSA9IC0xO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBTdGFydCB0cmFja2luZyB3aGVuIHdlIHNlZSBlbHNlIGlmXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2Vsc2UgaWYnKSB8fCBsaW5lLmluY2x1ZGVzKCd9IGVsc2UgaWYnKSkge1xyXG4gICAgICAgIGluRWxzZUlmQ2hhaW4gPSB0cnVlO1xyXG4gICAgICAgIGVsc2VJZkxpbmUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIEZvdW5kIGEgZmluYWwgZWxzZSAtIGNoYWluIGlzIHByb3Blcmx5IHRlcm1pbmF0ZWRcclxuICAgICAgZWxzZSBpZiAoaW5FbHNlSWZDaGFpbiAmJiAobGluZS5zdGFydHNXaXRoKCdlbHNlIHsnKSB8fCBsaW5lID09PSAnZWxzZScgfHwgbGluZS5pbmNsdWRlcygnfSBlbHNlIHsnKSkpIHtcclxuICAgICAgICBpbkVsc2VJZkNoYWluID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgICAgLy8gRm91bmQgc29tZXRoaW5nIGVsc2UgdGhhdCBlbmRzIHRoZSBjaGFpbiB3aXRob3V0IGVsc2VcclxuICAgICAgZWxzZSBpZiAoaW5FbHNlSWZDaGFpbiAmJiBsaW5lLnN0YXJ0c1dpdGgoJ30nKSAmJiAhbGluZS5pbmNsdWRlcygnZWxzZScpKSB7XHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG5leHQgbm9uLWVtcHR5IGxpbmUgaXMgZWxzZVxyXG4gICAgICAgIGxldCBmb3VuZEVsc2UgPSBmYWxzZTtcclxuICAgICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgY29uc3QgbmV4dExpbmUgPSBsaW5lc1tqXS50cmltKCk7XHJcbiAgICAgICAgICBpZiAoIW5leHRMaW5lKSBjb250aW51ZTtcclxuICAgICAgICAgIGlmIChuZXh0TGluZS5zdGFydHNXaXRoKCdlbHNlJykgJiYgIW5leHRMaW5lLnN0YXJ0c1dpdGgoJ2Vsc2UgaWYnKSkge1xyXG4gICAgICAgICAgICBmb3VuZEVsc2UgPSB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghZm91bmRFbHNlKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGVsc2VJZkxpbmUgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgJ2lmLi4uZWxzZSBpZiBjb25zdHJ1Y3QgbXVzdCBiZSB0ZXJtaW5hdGVkIHdpdGggYW4gZWxzZSBjbGF1c2UnLFxyXG4gICAgICAgICAgICAgIGxpbmVzW2Vsc2VJZkxpbmVdXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluRWxzZUlmQ2hhaW4gPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=