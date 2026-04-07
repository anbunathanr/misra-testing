"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.6
 * The value of a composite expression shall not be assigned to an object with wider essential type.
 */
class Rule_C_10_6 {
    id = 'MISRA-C-10.6';
    description = 'The value of a composite expression shall not be assigned to an object with wider essential type';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for assignment of narrow type expression to wider type
            const wideningMatch = line.match(/(long|double)\s+\w+\s*=\s*\w+\s*[+\-*\/]\s*\w+/);
            if (wideningMatch && !line.includes('(long)') && !line.includes('(double)')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Composite expression assigned to wider type without explicit cast', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_10_6 = Rule_C_10_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC02LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC02LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsa0dBQWtHLENBQUM7SUFDakgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQywrREFBK0Q7WUFDL0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1lBQ25GLElBQUksYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDNUUsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG1FQUFtRSxFQUNuRSxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5QkQsa0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEwLjZcclxuICogVGhlIHZhbHVlIG9mIGEgY29tcG9zaXRlIGV4cHJlc3Npb24gc2hhbGwgbm90IGJlIGFzc2lnbmVkIHRvIGFuIG9iamVjdCB3aXRoIHdpZGVyIGVzc2VudGlhbCB0eXBlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMF82IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTEwLjYnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSB2YWx1ZSBvZiBhIGNvbXBvc2l0ZSBleHByZXNzaW9uIHNoYWxsIG5vdCBiZSBhc3NpZ25lZCB0byBhbiBvYmplY3Qgd2l0aCB3aWRlciBlc3NlbnRpYWwgdHlwZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbnZlcnNpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgYXNzaWdubWVudCBvZiBuYXJyb3cgdHlwZSBleHByZXNzaW9uIHRvIHdpZGVyIHR5cGVcclxuICAgICAgY29uc3Qgd2lkZW5pbmdNYXRjaCA9IGxpbmUubWF0Y2goLyhsb25nfGRvdWJsZSlcXHMrXFx3K1xccyo9XFxzKlxcdytcXHMqWytcXC0qXFwvXVxccypcXHcrLyk7XHJcbiAgICAgIGlmICh3aWRlbmluZ01hdGNoICYmICFsaW5lLmluY2x1ZGVzKCcobG9uZyknKSAmJiAhbGluZS5pbmNsdWRlcygnKGRvdWJsZSknKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdDb21wb3NpdGUgZXhwcmVzc2lvbiBhc3NpZ25lZCB0byB3aWRlciB0eXBlIHdpdGhvdXQgZXhwbGljaXQgY2FzdCcsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==