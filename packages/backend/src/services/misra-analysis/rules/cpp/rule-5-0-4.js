"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_0_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-0-4
 * An implicit integral conversion shall not change the signedness of the underlying type.
 */
class Rule_CPP_5_0_4 {
    id = 'MISRA-CPP-5.0.4';
    description = 'Implicit integral conversions shall not change signedness';
    severity = 'required';
    category = 'Conversions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // unsigned to signed or vice versa
            if (/\bunsigned\s+\w+\s*=\s*-\d+/.test(line)) {
                if (!line.includes('cast')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Implicit conversion changes signedness (negative to unsigned)', line));
                }
            }
            if (/\bint\s+\w+\s*=\s*\d+[uU]\b/.test(line)) {
                if (!line.includes('cast')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Implicit conversion changes signedness (unsigned to signed)', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_0_4 = Rule_CPP_5_0_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTAtNC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0wLTQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLDJEQUEyRCxDQUFDO0lBQzFFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsbUNBQW1DO1lBQ25DLElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCwrREFBK0QsRUFDL0QsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzNCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCw2REFBNkQsRUFDN0QsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEvQ0Qsd0NBK0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNS0wLTRcclxuICogQW4gaW1wbGljaXQgaW50ZWdyYWwgY29udmVyc2lvbiBzaGFsbCBub3QgY2hhbmdlIHRoZSBzaWduZWRuZXNzIG9mIHRoZSB1bmRlcmx5aW5nIHR5cGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfNV8wXzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC01LjAuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnSW1wbGljaXQgaW50ZWdyYWwgY29udmVyc2lvbnMgc2hhbGwgbm90IGNoYW5nZSBzaWduZWRuZXNzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udmVyc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIHVuc2lnbmVkIHRvIHNpZ25lZCBvciB2aWNlIHZlcnNhXHJcbiAgICAgIGlmICgvXFxidW5zaWduZWRcXHMrXFx3K1xccyo9XFxzKi1cXGQrLy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgaWYgKCFsaW5lLmluY2x1ZGVzKCdjYXN0JykpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnSW1wbGljaXQgY29udmVyc2lvbiBjaGFuZ2VzIHNpZ25lZG5lc3MgKG5lZ2F0aXZlIHRvIHVuc2lnbmVkKScsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYgKC9cXGJpbnRcXHMrXFx3K1xccyo9XFxzKlxcZCtbdVVdXFxiLy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgaWYgKCFsaW5lLmluY2x1ZGVzKCdjYXN0JykpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnSW1wbGljaXQgY29udmVyc2lvbiBjaGFuZ2VzIHNpZ25lZG5lc3MgKHVuc2lnbmVkIHRvIHNpZ25lZCknLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19