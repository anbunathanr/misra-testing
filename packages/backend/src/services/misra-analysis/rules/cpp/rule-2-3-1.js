"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_3_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-3-1
 * Trigraphs shall not be used.
 * Detects trigraph sequences which can cause unexpected behavior.
 */
class Rule_CPP_2_3_1 {
    id = 'MISRA-CPP-2.3.1';
    description = 'Trigraphs shall not be used';
    severity = 'required';
    category = 'Lexical conventions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Trigraph sequences: ??=, ??/, ??', ??(, ??), ??!, ??<, ??>, ??-
        const trigraphs = ['??=', '??/', "??'", '??(', '??)', '??!', '??<', '??>', '??-'];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const trigraph of trigraphs) {
                if (line.includes(trigraph)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(trigraph), `Trigraph '${trigraph}' detected`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_3_1 = Rule_CPP_2_3_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTMtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMi0zLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw2QkFBNkIsQ0FBQztJQUM1QyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcscUJBQXFCLENBQUM7SUFDakMsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsa0VBQWtFO1FBQ2xFLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0QixLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFDdEIsYUFBYSxRQUFRLFlBQVksRUFDakMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFsQ0Qsd0NBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMi0zLTFcclxuICogVHJpZ3JhcGhzIHNoYWxsIG5vdCBiZSB1c2VkLlxyXG4gKiBEZXRlY3RzIHRyaWdyYXBoIHNlcXVlbmNlcyB3aGljaCBjYW4gY2F1c2UgdW5leHBlY3RlZCBiZWhhdmlvci5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8yXzNfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTIuMy4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdUcmlncmFwaHMgc2hhbGwgbm90IGJlIHVzZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdMZXhpY2FsIGNvbnZlbnRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyaWdyYXBoIHNlcXVlbmNlczogPz89LCA/Py8sID8/JywgPz8oLCA/PyksID8/ISwgPz88LCA/Pz4sID8/LVxyXG4gICAgY29uc3QgdHJpZ3JhcGhzID0gWyc/Pz0nLCAnPz8vJywgXCI/PydcIiwgJz8/KCcsICc/PyknLCAnPz8hJywgJz8/PCcsICc/Pz4nLCAnPz8tJ107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IHRyaWdyYXBoIG9mIHRyaWdyYXBocykge1xyXG4gICAgICAgIGlmIChsaW5lLmluY2x1ZGVzKHRyaWdyYXBoKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICBsaW5lLmluZGV4T2YodHJpZ3JhcGgpLFxyXG4gICAgICAgICAgICAgIGBUcmlncmFwaCAnJHt0cmlncmFwaH0nIGRldGVjdGVkYCxcclxuICAgICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=