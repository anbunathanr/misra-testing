"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_7_3 = void 0;
/**
 * MISRA C++:2008 Rule 2-7-3
 * Sections of code should not be "commented out" using C++ comments
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_2_7_3 {
    id = 'MISRA-CPP-2.7.3';
    description = 'Sections of code should not be "commented out" using C++ comments';
    severity = 'advisory';
    category = 'Comments';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_2_7_3 = Rule_CPP_2_7_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTctMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMi03LTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxtRUFBbUUsQ0FBQztJQUNsRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsVUFBVSxDQUFDO0lBQ3RCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSAyLTctM1xuICogU2VjdGlvbnMgb2YgY29kZSBzaG91bGQgbm90IGJlIFwiY29tbWVudGVkIG91dFwiIHVzaW5nIEMrKyBjb21tZW50c1xuICogXG4gKiBOT1RFOiBUaGlzIGlzIGEgc3R1YiBpbXBsZW1lbnRhdGlvbi4gRnVsbCBpbXBsZW1lbnRhdGlvbiByZXF1aXJlczpcbiAqIC0gRGV0YWlsZWQgQVNUIGFuYWx5c2lzIGZvciB0aGlzIHNwZWNpZmljIHJ1bGVcbiAqIC0gQ29tcHJlaGVuc2l2ZSB0ZXN0IGNhc2VzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdGhlIHJ1bGUgZW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8yXzdfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC0yLjcuMyc7XG4gIGRlc2NyaXB0aW9uID0gJ1NlY3Rpb25zIG9mIGNvZGUgc2hvdWxkIG5vdCBiZSBcImNvbW1lbnRlZCBvdXRcIiB1c2luZyBDKysgY29tbWVudHMnO1xuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0NvbW1lbnRzJztcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcblxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSByZXR1cm5zIG5vIHZpb2xhdGlvbnNcbiAgICAvLyBUT0RPOiBJbXBsZW1lbnQgZnVsbCBydWxlIGNoZWNraW5nIGxvZ2ljXG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG4iXX0=