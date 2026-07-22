package com.printforge.admin.adminservice.dto;

import java.math.BigDecimal;

// One point in GET /api/admin/dashboard/revenue-history's series — a
// calendar day (yyyy-MM-dd) and the sum of COMPLETED payment amounts that
// cleared on it. revenue is BigDecimal.ZERO, never omitted, for a day with
// no completed payments — the series is always continuous.
public record RevenueHistoryEntry(String date, BigDecimal revenue) {}
