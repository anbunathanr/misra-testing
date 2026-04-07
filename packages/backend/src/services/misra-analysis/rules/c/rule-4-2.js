"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_4_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 4.2
 * Trigraphs should not be used.
 */
class Rule_C_4_2 {
    id = 'MISRA-C-4.2';
    description = 'Trigraphs should not be used';
    severity = 'advisory';
    category = 'Character sets';
    language = 'C';
    trigraphs = [
        '??=', '??/', "??'", '??(', '??)', '??!', '??<', '??>', '??-'
    ];
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const trigraph of this.trigraphs) {
                if (line.includes(trigraph)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(trigraph), `Trigraph '${trigraph}' used`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_4_2 = Rule_C_4_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS00LTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTQtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDhCQUE4QixDQUFDO0lBQzdDLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRVAsU0FBUyxHQUFHO1FBQzNCLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSztLQUM5RCxDQUFDO0lBRUYsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRCLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFDdEIsYUFBYSxRQUFRLFFBQVEsRUFDN0IsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFuQ0QsZ0NBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDQuMlxyXG4gKiBUcmlncmFwaHMgc2hvdWxkIG5vdCBiZSB1c2VkLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ180XzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtNC4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdUcmlncmFwaHMgc2hvdWxkIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ2hhcmFjdGVyIHNldHMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBwcml2YXRlIHJlYWRvbmx5IHRyaWdyYXBocyA9IFtcclxuICAgICc/Pz0nLCAnPz8vJywgXCI/PydcIiwgJz8/KCcsICc/PyknLCAnPz8hJywgJz8/PCcsICc/Pz4nLCAnPz8tJ1xyXG4gIF07XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IHRyaWdyYXBoIG9mIHRoaXMudHJpZ3JhcGhzKSB7XHJcbiAgICAgICAgaWYgKGxpbmUuaW5jbHVkZXModHJpZ3JhcGgpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIGxpbmUuaW5kZXhPZih0cmlncmFwaCksXHJcbiAgICAgICAgICAgICAgYFRyaWdyYXBoICcke3RyaWdyYXBofScgdXNlZGAsXHJcbiAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19