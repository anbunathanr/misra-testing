"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_9_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-9-1
 * The types used for an object, a function return type, or a function parameter
 * shall be token-for-token identical in all declarations and re-declarations.
 * Detects inconsistent typedef usage (same name redefined to different type).
 */
class Rule_CPP_3_9_1 {
    id = 'MISRA-CPP-3.9.1';
    description = 'Types used across translation units shall be identical';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect typedef redefinitions
        const typedefRegex = /^\s*typedef\s+(.+?)\s+(\w+)\s*;/;
        const typedefs = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('typedef'))
                continue;
            const match = line.match(typedefRegex);
            if (!match)
                continue;
            const typeName = match[2];
            const typeValue = match[1].trim();
            if (typedefs.has(typeName)) {
                const existing = typedefs.get(typeName);
                if (existing.type !== typeValue) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `typedef '${typeName}' redefined with different type (was '${existing.type}' at line ${existing.line})`, line));
                }
            }
            else {
                typedefs.set(typeName, { type: typeValue, line: i + 1 });
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_9_1 = Rule_CPP_3_9_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTktMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy05LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7OztHQUtHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQztJQUN2QixXQUFXLEdBQUcsd0RBQXdELENBQUM7SUFDdkUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QiwrQkFBK0I7UUFDL0IsTUFBTSxZQUFZLEdBQUcsaUNBQWlDLENBQUM7UUFDdkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTBDLENBQUM7UUFFbkUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO2dCQUFFLFNBQVM7WUFFMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsS0FBSztnQkFBRSxTQUFTO1lBRXJCLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFbEMsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUM7Z0JBQ3pDLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDaEMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELFlBQVksUUFBUSx5Q0FBeUMsUUFBUSxDQUFDLElBQUksYUFBYSxRQUFRLENBQUMsSUFBSSxHQUFHLEVBQ3ZHLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDTixRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzNELENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBN0NELHdDQTZDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDMtOS0xXHJcbiAqIFRoZSB0eXBlcyB1c2VkIGZvciBhbiBvYmplY3QsIGEgZnVuY3Rpb24gcmV0dXJuIHR5cGUsIG9yIGEgZnVuY3Rpb24gcGFyYW1ldGVyXHJcbiAqIHNoYWxsIGJlIHRva2VuLWZvci10b2tlbiBpZGVudGljYWwgaW4gYWxsIGRlY2xhcmF0aW9ucyBhbmQgcmUtZGVjbGFyYXRpb25zLlxyXG4gKiBEZXRlY3RzIGluY29uc2lzdGVudCB0eXBlZGVmIHVzYWdlIChzYW1lIG5hbWUgcmVkZWZpbmVkIHRvIGRpZmZlcmVudCB0eXBlKS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8zXzlfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTMuOS4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdUeXBlcyB1c2VkIGFjcm9zcyB0cmFuc2xhdGlvbiB1bml0cyBzaGFsbCBiZSBpZGVudGljYWwnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0IHR5cGVkZWYgcmVkZWZpbml0aW9uc1xyXG4gICAgY29uc3QgdHlwZWRlZlJlZ2V4ID0gL15cXHMqdHlwZWRlZlxccysoLis/KVxccysoXFx3KylcXHMqOy87XHJcbiAgICBjb25zdCB0eXBlZGVmcyA9IG5ldyBNYXA8c3RyaW5nLCB7IHR5cGU6IHN0cmluZzsgbGluZTogbnVtYmVyIH0+KCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAoIWxpbmUuc3RhcnRzV2l0aCgndHlwZWRlZicpKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCh0eXBlZGVmUmVnZXgpO1xyXG4gICAgICBpZiAoIW1hdGNoKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gbWF0Y2hbMl07XHJcbiAgICAgIGNvbnN0IHR5cGVWYWx1ZSA9IG1hdGNoWzFdLnRyaW0oKTtcclxuXHJcbiAgICAgIGlmICh0eXBlZGVmcy5oYXModHlwZU5hbWUpKSB7XHJcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSB0eXBlZGVmcy5nZXQodHlwZU5hbWUpITtcclxuICAgICAgICBpZiAoZXhpc3RpbmcudHlwZSAhPT0gdHlwZVZhbHVlKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYHR5cGVkZWYgJyR7dHlwZU5hbWV9JyByZWRlZmluZWQgd2l0aCBkaWZmZXJlbnQgdHlwZSAod2FzICcke2V4aXN0aW5nLnR5cGV9JyBhdCBsaW5lICR7ZXhpc3RpbmcubGluZX0pYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHR5cGVkZWZzLnNldCh0eXBlTmFtZSwgeyB0eXBlOiB0eXBlVmFsdWUsIGxpbmU6IGkgKyAxIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==