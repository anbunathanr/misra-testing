"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-7
 * The value returned by a function having a non-void return type shall always be used.
 * Detects function calls where the return value is discarded.
 */
class Rule_CPP_0_1_7 {
    id = 'MISRA-CPP-0.1.7';
    description = 'The value returned by a function having a non-void return type shall be used';
    severity = 'required';
    category = 'Functions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect function calls not assigned or used: functionName(...);
        const unusedCallRegex = /^\s*([a-zA-Z_]\w*)\s*\([^)]*\)\s*;\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            const match = line.match(unusedCallRegex);
            if (!match)
                continue;
            const funcName = match[1];
            // Skip known void functions and constructors
            const voidFunctions = ['printf', 'cout', 'cerr', 'free', 'delete'];
            if (voidFunctions.includes(funcName))
                continue;
            violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Return value of function '${funcName}' is not used`, line));
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_7 = Rule_CPP_0_1_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtNy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw4RUFBOEUsQ0FBQztJQUM3RixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsV0FBVyxDQUFDO0lBQ3ZCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGlFQUFpRTtRQUNqRSxNQUFNLGVBQWUsR0FBRyx3Q0FBd0MsQ0FBQztRQUVqRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxLQUFLO2dCQUFFLFNBQVM7WUFFckIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTFCLDZDQUE2QztZQUM3QyxNQUFNLGFBQWEsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNuRSxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO2dCQUFFLFNBQVM7WUFFL0MsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDZCQUE2QixRQUFRLGVBQWUsRUFDcEQsSUFBSSxDQUNMLENBQ0YsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF4Q0Qsd0NBd0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMC0xLTdcclxuICogVGhlIHZhbHVlIHJldHVybmVkIGJ5IGEgZnVuY3Rpb24gaGF2aW5nIGEgbm9uLXZvaWQgcmV0dXJuIHR5cGUgc2hhbGwgYWx3YXlzIGJlIHVzZWQuXHJcbiAqIERldGVjdHMgZnVuY3Rpb24gY2FsbHMgd2hlcmUgdGhlIHJldHVybiB2YWx1ZSBpcyBkaXNjYXJkZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMF8xXzcgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0wLjEuNyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHZhbHVlIHJldHVybmVkIGJ5IGEgZnVuY3Rpb24gaGF2aW5nIGEgbm9uLXZvaWQgcmV0dXJuIHR5cGUgc2hhbGwgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0Z1bmN0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3QgZnVuY3Rpb24gY2FsbHMgbm90IGFzc2lnbmVkIG9yIHVzZWQ6IGZ1bmN0aW9uTmFtZSguLi4pO1xyXG4gICAgY29uc3QgdW51c2VkQ2FsbFJlZ2V4ID0gL15cXHMqKFthLXpBLVpfXVxcdyopXFxzKlxcKFteKV0qXFwpXFxzKjtcXHMqJC87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCh1bnVzZWRDYWxsUmVnZXgpO1xyXG4gICAgICBpZiAoIW1hdGNoKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IGZ1bmNOYW1lID0gbWF0Y2hbMV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBTa2lwIGtub3duIHZvaWQgZnVuY3Rpb25zIGFuZCBjb25zdHJ1Y3RvcnNcclxuICAgICAgY29uc3Qgdm9pZEZ1bmN0aW9ucyA9IFsncHJpbnRmJywgJ2NvdXQnLCAnY2VycicsICdmcmVlJywgJ2RlbGV0ZSddO1xyXG4gICAgICBpZiAodm9pZEZ1bmN0aW9ucy5pbmNsdWRlcyhmdW5jTmFtZSkpIGNvbnRpbnVlO1xyXG4gICAgICBcclxuICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgIDAsXHJcbiAgICAgICAgICBgUmV0dXJuIHZhbHVlIG9mIGZ1bmN0aW9uICcke2Z1bmNOYW1lfScgaXMgbm90IHVzZWRgLFxyXG4gICAgICAgICAgbGluZVxyXG4gICAgICAgIClcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19