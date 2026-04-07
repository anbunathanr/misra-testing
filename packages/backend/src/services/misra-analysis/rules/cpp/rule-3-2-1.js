"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_2_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-2-1
 * All declarations of an object or function shall have compatible types.
 * Detects inconsistent declarations.
 */
class Rule_CPP_3_2_1 {
    id = 'MISRA-CPP-3.2.1';
    description = 'All declarations shall have compatible types';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track declarations: type name;
        const declarations = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Match declarations: type name; or extern type name;
            const declMatch = line.match(/^\s*(?:extern\s+)?(\w+(?:\s*[*&])?)\s+(\w+)\s*[;(]/);
            if (!declMatch)
                continue;
            const type = declMatch[1].trim();
            const name = declMatch[2];
            if (declarations.has(name)) {
                const prev = declarations.get(name);
                if (prev.type !== type) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Incompatible declaration of '${name}': '${type}' vs '${prev.type}' (line ${prev.line})`, line));
                }
            }
            else {
                declarations.set(name, { type, line: i + 1 });
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_2_1 = Rule_CPP_3_2_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTItMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0yLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw4Q0FBOEMsQ0FBQztJQUM3RCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGlDQUFpQztRQUNqQyxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBMEMsQ0FBQztRQUV2RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxzREFBc0Q7WUFDdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1lBQ25GLElBQUksQ0FBQyxTQUFTO2dCQUFFLFNBQVM7WUFFekIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxQixJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztnQkFDckMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDO29CQUN2QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZ0NBQWdDLElBQUksT0FBTyxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksV0FBVyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQ3hGLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDTixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEQsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE3Q0Qsd0NBNkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMy0yLTFcclxuICogQWxsIGRlY2xhcmF0aW9ucyBvZiBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gc2hhbGwgaGF2ZSBjb21wYXRpYmxlIHR5cGVzLlxyXG4gKiBEZXRlY3RzIGluY29uc2lzdGVudCBkZWNsYXJhdGlvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfM18yXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0zLjIuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQWxsIGRlY2xhcmF0aW9ucyBzaGFsbCBoYXZlIGNvbXBhdGlibGUgdHlwZXMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gVHJhY2sgZGVjbGFyYXRpb25zOiB0eXBlIG5hbWU7XHJcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBuZXcgTWFwPHN0cmluZywgeyB0eXBlOiBzdHJpbmc7IGxpbmU6IG51bWJlciB9PigpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBNYXRjaCBkZWNsYXJhdGlvbnM6IHR5cGUgbmFtZTsgb3IgZXh0ZXJuIHR5cGUgbmFtZTtcclxuICAgICAgY29uc3QgZGVjbE1hdGNoID0gbGluZS5tYXRjaCgvXlxccyooPzpleHRlcm5cXHMrKT8oXFx3Kyg/OlxccypbKiZdKT8pXFxzKyhcXHcrKVxccypbOyhdLyk7XHJcbiAgICAgIGlmICghZGVjbE1hdGNoKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IHR5cGUgPSBkZWNsTWF0Y2hbMV0udHJpbSgpO1xyXG4gICAgICBjb25zdCBuYW1lID0gZGVjbE1hdGNoWzJdO1xyXG5cclxuICAgICAgaWYgKGRlY2xhcmF0aW9ucy5oYXMobmFtZSkpIHtcclxuICAgICAgICBjb25zdCBwcmV2ID0gZGVjbGFyYXRpb25zLmdldChuYW1lKSE7XHJcbiAgICAgICAgaWYgKHByZXYudHlwZSAhPT0gdHlwZSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBJbmNvbXBhdGlibGUgZGVjbGFyYXRpb24gb2YgJyR7bmFtZX0nOiAnJHt0eXBlfScgdnMgJyR7cHJldi50eXBlfScgKGxpbmUgJHtwcmV2LmxpbmV9KWAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBkZWNsYXJhdGlvbnMuc2V0KG5hbWUsIHsgdHlwZSwgbGluZTogaSArIDEgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19