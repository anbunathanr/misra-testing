"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_2_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-2-3
 * A type, object or function that is used in multiple translation units shall be declared in one and only one file.
 * Detects missing extern declarations.
 */
class Rule_CPP_3_2_3 {
    id = 'MISRA-CPP-3.2.3';
    description = 'Entities used in multiple translation units shall be declared in one file';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Check for global variables without extern in .cpp files
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Global variable declaration without extern
            const globalVarMatch = line.match(/^\s*(\w+)\s+(\w+)\s*=\s*[^;]+;/);
            if (globalVarMatch && !line.includes('extern') && !line.includes('static') && !line.includes('const')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Global variable '${globalVarMatch[2]}' should be declared with 'extern' or 'static'`, line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_2_3 = Rule_CPP_3_2_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTItMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0yLTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywyRUFBMkUsQ0FBQztJQUMxRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDBEQUEwRDtRQUMxRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSw2Q0FBNkM7WUFDN0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3BFLElBQUksY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RHLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxvQkFBb0IsY0FBYyxDQUFDLENBQUMsQ0FBQyxnREFBZ0QsRUFDckYsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBakNELHdDQWlDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDMtMi0zXHJcbiAqIEEgdHlwZSwgb2JqZWN0IG9yIGZ1bmN0aW9uIHRoYXQgaXMgdXNlZCBpbiBtdWx0aXBsZSB0cmFuc2xhdGlvbiB1bml0cyBzaGFsbCBiZSBkZWNsYXJlZCBpbiBvbmUgYW5kIG9ubHkgb25lIGZpbGUuXHJcbiAqIERldGVjdHMgbWlzc2luZyBleHRlcm4gZGVjbGFyYXRpb25zLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzNfMl8zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMy4yLjMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0VudGl0aWVzIHVzZWQgaW4gbXVsdGlwbGUgdHJhbnNsYXRpb24gdW5pdHMgc2hhbGwgYmUgZGVjbGFyZWQgaW4gb25lIGZpbGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIGdsb2JhbCB2YXJpYWJsZXMgd2l0aG91dCBleHRlcm4gaW4gLmNwcCBmaWxlc1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIEdsb2JhbCB2YXJpYWJsZSBkZWNsYXJhdGlvbiB3aXRob3V0IGV4dGVyblxyXG4gICAgICBjb25zdCBnbG9iYWxWYXJNYXRjaCA9IGxpbmUubWF0Y2goL15cXHMqKFxcdyspXFxzKyhcXHcrKVxccyo9XFxzKlteO10rOy8pO1xyXG4gICAgICBpZiAoZ2xvYmFsVmFyTWF0Y2ggJiYgIWxpbmUuaW5jbHVkZXMoJ2V4dGVybicpICYmICFsaW5lLmluY2x1ZGVzKCdzdGF0aWMnKSAmJiAhbGluZS5pbmNsdWRlcygnY29uc3QnKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIGBHbG9iYWwgdmFyaWFibGUgJyR7Z2xvYmFsVmFyTWF0Y2hbMl19JyBzaG91bGQgYmUgZGVjbGFyZWQgd2l0aCAnZXh0ZXJuJyBvciAnc3RhdGljJ2AsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==