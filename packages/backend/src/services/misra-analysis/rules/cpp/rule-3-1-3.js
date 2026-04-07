"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_1_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-1-3
 * It shall be possible to include any header file in multiple translation units without violating the One Definition Rule.
 * Detects missing include guards.
 */
class Rule_CPP_3_1_3 {
    id = 'MISRA-CPP-3.1.3';
    description = 'Header files shall have include guards';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Only check header files
        if (!sourceCode.includes('.h') && !sourceCode.includes('.hpp')) {
            return violations;
        }
        // Check for include guard pattern: #ifndef, #define, #endif
        let hasIfndef = false;
        let hasDefine = false;
        let hasEndif = false;
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('#ifndef'))
                hasIfndef = true;
            if (line.startsWith('#define'))
                hasDefine = true;
        }
        for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#endif'))
                hasEndif = true;
        }
        if (!hasIfndef || !hasDefine || !hasEndif) {
            violations.push((0, rule_engine_1.createViolation)(this, 1, 0, 'Header file missing include guards (#ifndef/#define/#endif)', lines[0] || ''));
        }
        return violations;
    }
}
exports.Rule_CPP_3_1_3 = Rule_CPP_3_1_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTEtMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0xLTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx3Q0FBd0MsQ0FBQztJQUN2RCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMvRCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRUQsNERBQTREO1FBQzVELElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBRXJCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztnQkFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ2pELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQUUsU0FBUyxHQUFHLElBQUksQ0FBQztRQUNuRCxDQUFDO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEUsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsUUFBUSxHQUFHLElBQUksQ0FBQztRQUNqRCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzFDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEVBQ0QsQ0FBQyxFQUNELDZEQUE2RCxFQUM3RCxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUNmLENBQ0YsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5Q0Qsd0NBOENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMy0xLTNcclxuICogSXQgc2hhbGwgYmUgcG9zc2libGUgdG8gaW5jbHVkZSBhbnkgaGVhZGVyIGZpbGUgaW4gbXVsdGlwbGUgdHJhbnNsYXRpb24gdW5pdHMgd2l0aG91dCB2aW9sYXRpbmcgdGhlIE9uZSBEZWZpbml0aW9uIFJ1bGUuXHJcbiAqIERldGVjdHMgbWlzc2luZyBpbmNsdWRlIGd1YXJkcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8zXzFfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTMuMS4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdIZWFkZXIgZmlsZXMgc2hhbGwgaGF2ZSBpbmNsdWRlIGd1YXJkcyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBPbmx5IGNoZWNrIGhlYWRlciBmaWxlc1xyXG4gICAgaWYgKCFzb3VyY2VDb2RlLmluY2x1ZGVzKCcuaCcpICYmICFzb3VyY2VDb2RlLmluY2x1ZGVzKCcuaHBwJykpIHtcclxuICAgICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIGluY2x1ZGUgZ3VhcmQgcGF0dGVybjogI2lmbmRlZiwgI2RlZmluZSwgI2VuZGlmXHJcbiAgICBsZXQgaGFzSWZuZGVmID0gZmFsc2U7XHJcbiAgICBsZXQgaGFzRGVmaW5lID0gZmFsc2U7XHJcbiAgICBsZXQgaGFzRW5kaWYgPSBmYWxzZTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKDEwLCBsaW5lcy5sZW5ndGgpOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnI2lmbmRlZicpKSBoYXNJZm5kZWYgPSB0cnVlO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcjZGVmaW5lJykpIGhhc0RlZmluZSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IE1hdGgubWF4KDAsIGxpbmVzLmxlbmd0aCAtIDUpOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnI2VuZGlmJykpIGhhc0VuZGlmID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWhhc0lmbmRlZiB8fCAhaGFzRGVmaW5lIHx8ICFoYXNFbmRpZikge1xyXG4gICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgdGhpcyxcclxuICAgICAgICAgIDEsXHJcbiAgICAgICAgICAwLFxyXG4gICAgICAgICAgJ0hlYWRlciBmaWxlIG1pc3NpbmcgaW5jbHVkZSBndWFyZHMgKCNpZm5kZWYvI2RlZmluZS8jZW5kaWYpJyxcclxuICAgICAgICAgIGxpbmVzWzBdIHx8ICcnXHJcbiAgICAgICAgKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=