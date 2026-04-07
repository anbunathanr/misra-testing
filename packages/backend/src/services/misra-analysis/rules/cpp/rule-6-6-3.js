"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_6_3 = void 0;
/**
 * MISRA C++:2008 Rule 6-6-3
 * The continue statement shall only be used within a well-formed for loop
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_6_6_3 {
    id = 'MISRA-CPP-6.6.3';
    description = 'The continue statement shall only be used within a well-formed for loop';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_6_6_3 = Rule_CPP_6_6_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTYtMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi02LTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx5RUFBeUUsQ0FBQztJQUN4RixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSA2LTYtM1xuICogVGhlIGNvbnRpbnVlIHN0YXRlbWVudCBzaGFsbCBvbmx5IGJlIHVzZWQgd2l0aGluIGEgd2VsbC1mb3JtZWQgZm9yIGxvb3BcbiAqIFxuICogTk9URTogVGhpcyBpcyBhIHN0dWIgaW1wbGVtZW50YXRpb24uIEZ1bGwgaW1wbGVtZW50YXRpb24gcmVxdWlyZXM6XG4gKiAtIERldGFpbGVkIEFTVCBhbmFseXNpcyBmb3IgdGhpcyBzcGVjaWZpYyBydWxlXG4gKiAtIENvbXByZWhlbnNpdmUgdGVzdCBjYXNlc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHRoZSBydWxlIGVuZ2luZVxuICovXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfNl82XzMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xuICBpZCA9ICdNSVNSQS1DUFAtNi42LjMnO1xuICBkZXNjcmlwdGlvbiA9ICdUaGUgY29udGludWUgc3RhdGVtZW50IHNoYWxsIG9ubHkgYmUgdXNlZCB3aXRoaW4gYSB3ZWxsLWZvcm1lZCBmb3IgbG9vcCc7XG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcblxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSByZXR1cm5zIG5vIHZpb2xhdGlvbnNcbiAgICAvLyBUT0RPOiBJbXBsZW1lbnQgZnVsbCBydWxlIGNoZWNraW5nIGxvZ2ljXG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG4iXX0=