"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_3_1 = void 0;
/**
 * MISRA C++:2008 Rule 0-3-1
 * Minimization of run-time failures shall be ensured by the use of at least one of: (a) static analysis tools/techniques; (b) dynamic analysis tools/techniques; (c) explicit coding of checks to handle run-time faults
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_0_3_1 {
    id = 'MISRA-CPP-0.3.1';
    description = 'Minimization of run-time failures shall be ensured by the use of at least one of: (a) static analysis tools/techniques; (b) dynamic analysis tools/techniques; (c) explicit coding of checks to handle run-time faults';
    severity = 'required';
    category = 'General';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_0_3_1 = Rule_CPP_0_3_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTMtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0zLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx3TkFBd04sQ0FBQztJQUN2TyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3JCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSAwLTMtMVxuICogTWluaW1pemF0aW9uIG9mIHJ1bi10aW1lIGZhaWx1cmVzIHNoYWxsIGJlIGVuc3VyZWQgYnkgdGhlIHVzZSBvZiBhdCBsZWFzdCBvbmUgb2Y6IChhKSBzdGF0aWMgYW5hbHlzaXMgdG9vbHMvdGVjaG5pcXVlczsgKGIpIGR5bmFtaWMgYW5hbHlzaXMgdG9vbHMvdGVjaG5pcXVlczsgKGMpIGV4cGxpY2l0IGNvZGluZyBvZiBjaGVja3MgdG8gaGFuZGxlIHJ1bi10aW1lIGZhdWx0c1xuICogXG4gKiBOT1RFOiBUaGlzIGlzIGEgc3R1YiBpbXBsZW1lbnRhdGlvbi4gRnVsbCBpbXBsZW1lbnRhdGlvbiByZXF1aXJlczpcbiAqIC0gRGV0YWlsZWQgQVNUIGFuYWx5c2lzIGZvciB0aGlzIHNwZWNpZmljIHJ1bGVcbiAqIC0gQ29tcHJlaGVuc2l2ZSB0ZXN0IGNhc2VzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdGhlIHJ1bGUgZW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8wXzNfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC0wLjMuMSc7XG4gIGRlc2NyaXB0aW9uID0gJ01pbmltaXphdGlvbiBvZiBydW4tdGltZSBmYWlsdXJlcyBzaGFsbCBiZSBlbnN1cmVkIGJ5IHRoZSB1c2Ugb2YgYXQgbGVhc3Qgb25lIG9mOiAoYSkgc3RhdGljIGFuYWx5c2lzIHRvb2xzL3RlY2huaXF1ZXM7IChiKSBkeW5hbWljIGFuYWx5c2lzIHRvb2xzL3RlY2huaXF1ZXM7IChjKSBleHBsaWNpdCBjb2Rpbmcgb2YgY2hlY2tzIHRvIGhhbmRsZSBydW4tdGltZSBmYXVsdHMnO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0dlbmVyYWwnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==